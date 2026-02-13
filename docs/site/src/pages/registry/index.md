---
title: Registry
layout: base.liquid
permalink: /registry/
---

# Registry

Design system terminology (sizes, states, variants, glossary).

<ul>
{% for item in collections.registry %}
  <li>
    <a href="/registry/{{ item.fileSlug }}/">{{ item.data.title | default: item.fileSlug }}</a>
  </li>
{% endfor %}
</ul>
