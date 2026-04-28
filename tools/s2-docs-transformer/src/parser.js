/**
 * S2 Documentation Parser
 * Extracts structured content from S2 docs pages
 */

/**
 * Parse a component page snapshot into structured data
 */
export function parseComponentPage(snapshot, url) {
  const component = {
    name: "",
    url: url,
    overview: "",
    sections: [],
    navigation: [],
  };

  // Extract component name from page title or heading
  const titleMatch = snapshot.match(/heading "([^"]+)" \[level=1\]/);
  if (titleMatch) {
    component.name = titleMatch[1];
  }

  // Extract main content sections
  const mainContentMatch = snapshot.match(/main "Main content"[\s\S]*$/);
  if (mainContentMatch) {
    const mainContent = mainContentMatch[0];

    // Find all section headings
    const headingRegex = /heading "([^"#]+)#?" \[level=(\d)\]/g;
    let match;
    const sections = [];

    while ((match = headingRegex.exec(mainContent)) !== null) {
      sections.push({
        title: match[1].trim(),
        level: parseInt(match[2]),
        position: match.index,
      });
    }

    component.sections = sections;
  }

  // Extract navigation items from "On this page" section
  const onThisPageMatch = snapshot.match(
    /heading "On this page"[\s\S]*?(?=(?:heading|$))/,
  );
  if (onThisPageMatch) {
    const navItems = onThisPageMatch[0].match(/link "([^"]+)"/g);
    if (navItems) {
      component.navigation = navItems.map(
        (item) => item.match(/link "([^"]+)"/)[1],
      );
    }
  }

  return component;
}

/**
 * Extract component list from navigation
 */
export function extractComponentList(snapshot) {
  const components = {
    actions: [],
    containers: [],
    feedback: [],
    inputs: [],
    navigation: [],
    status: [],
  };

  const categories = [
    "Actions",
    "Containers",
    "Feedback",
    "Inputs",
    "Navigation",
    "Status",
  ];

  for (const category of categories) {
    const categoryKey = category.toLowerCase();
    const categoryRegex = new RegExp(
      `link "${category}"[\\s\\S]*?list "${category}"[\\s\\S]*?(?=listitem \\[ref=|$)`,
      "i",
    );
    const categoryMatch = snapshot.match(categoryRegex);

    if (categoryMatch) {
      const componentLinks = categoryMatch[0].match(
        /link "([^"]+)" \[ref=[^\]]+\] \[cursor=pointer\]:\s*- \/url: \/page\/([^/]+)\//g,
      );

      if (componentLinks) {
        for (const link of componentLinks) {
          const nameMatch = link.match(/link "([^"]+)"/);
          const urlMatch = link.match(/\/page\/([^/]+)\//);

          if (nameMatch && urlMatch) {
            components[categoryKey].push({
              name: nameMatch[1],
              slug: urlMatch[1],
              url: `https://s2.spectrum.corp.adobe.com/page/${urlMatch[1]}/`,
            });
          }
        }
      }
    }
  }

  return components;
}

/**
 * Convert component data to markdown
 */
export function componentToMarkdown(component, pageContent = "") {
  const lines = [];

  lines.push(`# ${component.name}`);
  lines.push("");
  lines.push(`> Last updated: ${new Date().toISOString().split("T")[0]}`);
  lines.push(`> Source: ${component.url}`);
  lines.push("");

  if (component.navigation.length > 0) {
    lines.push("## On this page");
    lines.push("");
    for (const item of component.navigation) {
      lines.push(`- [${item}](#${item.toLowerCase().replace(/\s+/g, "-")})`);
    }
    lines.push("");
  }

  if (component.sections.length > 0) {
    lines.push("## Sections");
    lines.push("");
    for (const section of component.sections) {
      lines.push(`${"#".repeat(section.level + 1)} ${section.title}`);
      lines.push("");
      lines.push("[Content to be extracted from page]");
      lines.push("");
    }
  }

  if (pageContent) {
    lines.push("## Raw Content");
    lines.push("");
    lines.push("```");
    lines.push(pageContent);
    lines.push("```");
  }

  return lines.join("\n");
}
