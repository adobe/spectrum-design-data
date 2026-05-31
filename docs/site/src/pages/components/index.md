---
title: Components
layout: base.liquid
permalink: /components/
---

# Components

Component API schemas for Spectrum.

<ul>
{% for item in collections.components %}
  <li>
    <a href="/components/{{ item.fileSlug }}/">{{ item.data.title | default: item.fileSlug }}</a>{% if item.data.description %} — {{ item.data.description }}{% endif %}
  </li>
{% endfor %}
</ul>
