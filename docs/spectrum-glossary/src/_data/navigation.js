export default [
  {
    label: "Home",
    url: "/",
    icon: "home",
  },
  {
    label: "Categories",
    url: "/categories/",
    icon: "folder",
    children: [
      { label: "States", url: "/categories/states/" },
      { label: "Sizes", url: "/categories/sizes/" },
      { label: "Variants", url: "/categories/variants/" },
      { label: "Anatomy Terms", url: "/categories/anatomyTerms/" },
      { label: "Components", url: "/categories/components/" },
      { label: "Scale Values", url: "/categories/scaleValues/" },
      { label: "Platforms", url: "/categories/platforms/" },
      { label: "Navigation Terms", url: "/categories/navigationTerms/" },
      { label: "Token Terminology", url: "/categories/tokenTerminology/" },
      { label: "Glossary", url: "/categories/glossary/" },
    ],
  },
  {
    label: "API",
    url: "/api/v1/glossary.json",
    icon: "code",
    external: true,
  },
  {
    label: "GitHub",
    url: "https://github.com/adobe/spectrum-design-data",
    icon: "github",
    external: true,
  },
];
