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
}

impl FigmaClient {
    pub fn new(token: String) -> Self {
        Self {
            token,
            client: reqwest::Client::new(),
        }
    }

    /// Fetch all local variables from a Figma file.
    ///
    /// `GET /v1/files/:file_key/variables/local`
    pub async fn get_local_variables(
        &self,
        file_key: &str,
    ) -> Result<GetVariablesResponse, FigmaError> {
        let url = format!("{BASE_URL}/v1/files/{file_key}/variables/local");
        let resp = self
            .client
            .get(&url)
            .header("X-Figma-Token", &self.token)
            .send()
            .await?;

        let status = resp.status().as_u16();
        if status != 200 {
            let body = resp.text().await.unwrap_or_default();
            return Err(FigmaError::Api {
                status,
                message: body,
            });
        }

        Ok(resp.json().await?)
    }

    /// Create, update, or delete variables in a Figma file.
    ///
    /// `POST /v1/files/:file_key/variables`
    pub async fn post_variables(
        &self,
        file_key: &str,
        body: &PostVariablesBody,
    ) -> Result<PostVariablesResponse, FigmaError> {
        let url = format!("{BASE_URL}/v1/files/{file_key}/variables");
        let resp = self
            .client
            .post(&url)
            .header("X-Figma-Token", &self.token)
            .json(body)
            .send()
            .await?;

        let status = resp.status().as_u16();
        if status != 200 {
            let body = resp.text().await.unwrap_or_default();
            return Err(FigmaError::Api {
                status,
                message: body,
            });
        }

        Ok(resp.json().await?)
    }
}
