// Element resolution for natural language targeting

export interface ElementReference {
  text: string;
  type?: 'button' | 'heading' | 'link' | 'input' | 'field' | 'text' | 'section' | 'image' | 'icon' | 'label';
}

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

export function resolveElementByText(text: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.contains(text).first();
}

export function resolveElementByTypeAndText(
  type: string,
  text: string
): Cypress.Chainable<JQuery<HTMLElement>> {
  const normalizedType = type.toLowerCase().trim();

  switch (normalizedType) {
    case 'button': {
      return cy.contains('button', text);
    }

    case 'heading':
    case 'headings': {
      const headingSelector = HEADING_TAGS.join(', ');
      return cy.get(headingSelector).filter(`:contains("${text}")`).first();
    }

    case 'link': {
      return cy.contains('a', text);
    }

    case 'input':
    case 'field': {
      return cy.get('input').filter(`[value="${text}"], [placeholder="${text}"]`).first()
        .then($input => {
          if ($input.length === 0) {
            return cy.contains('label', text).invoke('attr', 'for').then((id): Cypress.Chainable<JQuery<HTMLElement>> => {
              if (id && typeof id === 'string') {
                return cy.get(`#${id}`);
              }
              return cy.get('input').first();
            });
          }
          return cy.wrap($input);
        });
    }

    case 'text':
    case 'label': {
      return cy.contains(text).first();
    }

    case 'section': {
      return cy.contains('section', text).first();
    }

    case 'image':
    case 'icon': {
      return cy.get(`img[alt="${text}"], [aria-label="${text}"]`).first();
    }

    case 'div':
    case 'card': {
      return cy.contains('div', text).first();
    }

    default: {
      return cy.contains(text).first();
    }
  }
}

interface ElementMatchGroups {
  text?: string;
  type?: string;
}

export function findElement(description: string): Cypress.Chainable<JQuery<HTMLElement>> {
  const patterns: RegExp[] = [
    /^the\s+"(?<text>[^"]+)"\s+button$/i,
    /^the\s+"(?<text>[^"]+)"\s+(?<type>button|link|heading|input|field|text|section|image|icon|label)s?$/i,
    /^the\s+(?<type>button|link|heading|input|field|text|section|image|icon|label)s?\s+with\s+text\s+"(?<text>[^"]+)"$/i,
    /^the\s+"(?<text>[^"]+)"\s+(?<type>heading|input|field|text|section|image|icon|label)s?$/i,
  ];

  for (const pattern of patterns) {
    const match = new RegExp(pattern).exec(description);
    if (match?.groups) {
      const groups = match.groups as ElementMatchGroups;
      const { text, type } = groups;
      if (type && text) {
        return resolveElementByTypeAndText(type, text);
      }
      if (text) {
        return resolveElementByText(text);
      }
    }
  }

  return cy.contains(description);
}
