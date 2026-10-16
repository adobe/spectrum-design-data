// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Figma Variables REST API HTTP client.

use super::types::{GetVariablesResponse, PostVariablesBody, PostVariablesResponse};
use super::FigmaError;

const BASE_URL: &str = "https://api.figma.com";

/// Minimal async client for the Figma Variables REST API.
pub struct FigmaClient {
    token: String,
    client: reqwest::Client,
    base_url: String,
}

impl FigmaClient {
    pub fn new(token: String) -> Self {
        Self {
            token,
            client: reqwest::Client::builder()
                .redirect(reqwest::redirect::Policy::none())
                .retry(reqwest::retry::never())
                .timeout(std::time::Duration::from_secs(60))
                .build()
                .expect("static Figma HTTP client configuration"),
            base_url: BASE_URL.to_string(),
        }
    }

    /// Loopback-only transport seam for offline integration tests. Never send
    /// a Figma credential to an arbitrary endpoint or follow a redirect.
    pub fn with_base_url(token: String, base_url: &str) -> Result<Self, FigmaError> {
        let url = reqwest::Url::parse(base_url)
            .map_err(|_| FigmaError::InvalidResponse("invalid API base URL".into()))?;
        let loopback = matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"));
        if !loopback
            || !matches!(url.scheme(), "http" | "https")
            || !url.username().is_empty()
            || url.password().is_some()
            || url.query().is_some()
            || url.fragment().is_some()
            || url.path() != "/"
        {
            return Err(FigmaError::InvalidResponse(
                "API base URL override must be a loopback HTTP(S) origin".into(),
            ));
        }
        let mut client = Self::new(token);
        client.base_url = base_url.trim_end_matches('/').to_string();
        Ok(client)
    }

    /// Fetch all local variables from a Figma file.
    ///
    /// `GET /v1/files/:file_key/variables/local`
    pub async fn get_local_variables(
        &self,
        file_key: &str,
    ) -> Result<GetVariablesResponse, FigmaError> {
        let bytes = self.fetch_local_variables(file_key).await?;
        serde_json::from_slice(&bytes)
            .map_err(|_| FigmaError::InvalidResponse("invalid variables/local schema".into()))
    }

    /// Retain all API metadata and number representations for write guards.
    pub async fn get_local_variables_with_raw(
        &self,
        file_key: &str,
    ) -> Result<(GetVariablesResponse, serde_json::Value), FigmaError> {
        let bytes = self.fetch_local_variables(file_key).await?;
        let typed = serde_json::from_slice(&bytes)
            .map_err(|_| FigmaError::InvalidResponse("invalid variables/local schema".into()))?;
        let raw = super::write_guard::parse_raw_snapshot(&bytes)
            .map_err(|e| FigmaError::InvalidResponse(e.to_string()))?;
        Ok((typed, raw))
    }

    pub async fn get_local_variables_raw(
        &self,
        file_key: &str,
    ) -> Result<serde_json::Value, FigmaError> {
        let bytes = self.fetch_local_variables(file_key).await?;
        super::write_guard::parse_raw_snapshot(&bytes)
            .map_err(|e| FigmaError::InvalidResponse(e.to_string()))
    }

    async fn fetch_local_variables(&self, file_key: &str) -> Result<Vec<u8>, FigmaError> {
        let url = format!("{}/v1/files/{file_key}/variables/local", self.base_url);
        let resp = self
            .client
            .get(&url)
            .header("X-Figma-Token", &self.token)
            .send()
            .await
            .map_err(|e| FigmaError::Http(e.without_url()))?;

        let status = resp.status().as_u16();
        if status != 200 {
            return Err(FigmaError::Api {
                status,
                message: "GET variables/local rejected; check permissions and rate limits".into(),
            });
        }

        let bytes = resp
            .bytes()
            .await
            .map_err(|e| FigmaError::Http(e.without_url()))?;
        let raw: serde_json::Value = serde_json::from_slice(&bytes)
            .map_err(|_| FigmaError::InvalidResponse("malformed variables/local JSON".into()))?;
        if raw["error"] != false || raw["status"] != 200 {
            return Err(FigmaError::InvalidResponse(
                "variables/local reported an error or missing status".into(),
            ));
        }
        Ok(bytes.to_vec())
    }

    /// Create, update, or delete variables in a Figma file.
    ///
    /// `POST /v1/files/:file_key/variables`
    pub async fn post_variables(
        &self,
        file_key: &str,
        body: &PostVariablesBody,
    ) -> Result<PostVariablesResponse, FigmaError> {
        let raw = serde_json::to_value(body).map_err(|_| {
            FigmaError::InvalidResponse("cannot serialize variables payload".into())
        })?;
        self.post_variables_raw(file_key, &raw).await
    }

    /// Send exactly the immutable payload that was checked and recorded.
    pub async fn post_variables_raw(
        &self,
        file_key: &str,
        body: &serde_json::Value,
    ) -> Result<PostVariablesResponse, FigmaError> {
        let url = format!("{}/v1/files/{file_key}/variables", self.base_url);
        let resp = self
            .client
            .post(&url)
            .header("X-Figma-Token", &self.token)
            .json(body)
            .send()
            .await
            .map_err(|_| FigmaError::AmbiguousWrite("POST transport failure".into()))?;

        let status = resp.status().as_u16();
        if status != 200 {
            if status >= 500 {
                return Err(FigmaError::AmbiguousWrite(format!(
                    "POST returned HTTP {status}"
                )));
            }
            return Err(FigmaError::Api {
                status,
                message:
                    "POST rejected; check permissions, payload and rate limits. No automatic retry"
                        .into(),
            });
        }

        let response: PostVariablesResponse = resp.json().await.map_err(|_| {
            FigmaError::AmbiguousWrite("POST response was unreadable or malformed".into())
        })?;
        if response.error || response.status != 200 {
            return Err(FigmaError::AmbiguousWrite(
                "POST response did not confirm acceptance".into(),
            ));
        }
        Ok(response)
    }
}
