***

title: Components
layout: base.liquid
permalink: /components/
-----------------------

# Components

Component API schemas for Spectrum.

<ul class="spectrum-SideNav">
{% for item in collections.components %}
  <li class="spectrum-SideNav-item">
    <a href="{{ pathPrefix }}/components/{{ item.fileSlug }}/" class="spectrum-SideNav-itemLink">{{ item.data.title | default: item.fileSlug }}</a>
  </li>
{% endfor %}
</ul>
