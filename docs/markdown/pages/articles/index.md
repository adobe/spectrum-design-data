---
title: Articles
layout: base.liquid
permalink: /articles/
source_url: https://opensource.adobe.com/spectrum-design-data/pages/articles/index/
---

# Articles

Concepts, release announcements, decisions, and roadmap updates from the Spectrum
Design Data team.

<div class="article-filters" role="group" aria-label="Filter by category">
  <button type="button" class="spectrum-ActionButton spectrum-ActionButton--sizeS is-active" data-filter="all">All</button>
  {% assign categories = "" | split: "" %}
  {% for item in collections.articles %}
    {% assign categories = categories | push: item.data.category %}
  {% endfor %}
  {% assign categories = categories | uniq | sort %}
  {% for category in categories %}
  <button type="button" class="spectrum-ActionButton spectrum-ActionButton--sizeS" data-filter="{{ category }}">{{ category }}</button>
  {% endfor %}
</div>

<ul class="article-list">
{% for item in collections.articles reversed %}
  <li class="article-card" data-category="{{ item.data.category }}">
    <a href="{{ item.url }}" class="spectrum-Link">{{ item.data.title | default: item.fileSlug }}</a>
    <p class="spectrum-Body spectrum-Body--sizeS">
      <span class="spectrum-Badge spectrum-Badge--sizeS">{{ item.data.category }}</span>
      {% if item.data.date %} · {{ item.data.date | date: "%B %-d, %Y" }}{% endif %}
    </p>
    {% if item.data.description %}<p class="spectrum-Body spectrum-Body--sizeS">{{ item.data.description }}</p>{% endif %}
  </li>
{% endfor %}
</ul>

<script src="/assets/js/article-filter.js" defer></script>
