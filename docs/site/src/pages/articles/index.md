---
title: Articles
layout: base.liquid
permalink: /articles/
---

# Articles

Concepts, release announcements, decisions, and roadmap updates from the Spectrum
Design Data team.

<div class="article-filters" role="group" aria-label="Filter by category">
  <button type="button" class="spectrum-ActionButton spectrum-ActionButton--sizeS is-selected" data-filter="all" aria-pressed="true">All</button>
  {%- assign categories = "" | split: "" -%}
  {%- for item in collections.articles -%}
    {%- assign categories = categories | push: item.data.category -%}
  {%- endfor -%}
  {%- assign categories = categories | uniq | sort -%}
  {%- for category in categories -%}
  <button type="button" class="spectrum-ActionButton spectrum-ActionButton--sizeS" data-filter="{{ category }}" aria-pressed="false">{{ category }}</button>
  {%- endfor -%}
</div>

<ul class="article-list">
{% for item in collections.articles reversed %}
  <li class="article-card" data-category="{{ item.data.category }}">
    <a href="{{ item.url }}" class="spectrum-Link spectrum-Link--quiet article-card-title">{{ item.data.title | default: item.fileSlug }}</a>
    <p class="article-card-meta">
      <span class="spectrum-Badge spectrum-Badge--sizeS spectrum-Badge--neutral"><span class="spectrum-Badge-label">{{ item.data.category }}</span></span>
      {% if item.data.date %}<span class="article-card-date">{{ item.data.date | date: "%B %-d, %Y" }}</span>{% endif %}
    </p>
    {% if item.data.description %}<p class="spectrum-Body spectrum-Body--sizeS article-card-description">{{ item.data.description }}</p>{% endif %}
  </li>
{% endfor %}
</ul>

<script src="/assets/js/article-filter.js" defer></script>
