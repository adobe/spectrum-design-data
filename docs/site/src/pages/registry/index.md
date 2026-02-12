---
title: Registry
layout: base.liquid
permalink: /registry/
---

# Registry

Design system terminology (sizes, states, variants, glossary).

<ul class="spectrum-SideNav">
{% for item in collections.registry %}
  <li class="spectrum-SideNav-item">
    <a href="{{ pathPrefix }}/registry/{{ item.fileSlug }}/" class="spectrum-SideNav-itemLink">{{ item.data.title | default: item.fileSlug }}</a>
  </li>
{% endfor %}
</ul>
