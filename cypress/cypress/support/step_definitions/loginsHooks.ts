import { Before, Step } from '@badeball/cypress-cucumber-preprocessor';

const doLogin = (context: Mocha.Context, kind: string, afterLoginLocation: string) => {

  const username = Cypress.env(`${kind}_username`);
  const password = Cypress.env(`${kind}_password`);

  if(!username || !password) {
    throw new Error(`Username or password for ${kind} not found.`);
  }
  
  cy.session(
    `${kind}-${username}`,
    () => {
      const landingPage = '/';
      // Visit the landing page
      Step(context, `I visit "${landingPage}"`);
      cy.visit(landingPage);
      
      cy.waitForPageLoad('img');
      // Click on the login button
      if(kind !== 'bceid') {        
        Step(context, 'I click on the "Log in with IDIR" button');
      } else if(kind === 'bceid') {
        Step(context, 'I click on the "Log in with Business BCeID" button');
      }

      // Wait for redirect to external domain
      cy.url({ timeout: 10000 }).should('include', 'logontest7.gov.bc.ca');
      cy.get('.site-title').should('be.visible');
      
      // Log into the application, not using a step here to prevent password spillage
      cy.get("#user").type(username, { log: false });
      cy.get("#password").type(password, { log: false });
      cy.get('input[type="submit"]').click();

      // Validate the login for session purposes
      cy.url().should('include', afterLoginLocation);      
      cy.getCookies().then((cookies) => {
        cookies.forEach((cookie) => cy.setCookie(cookie.name, cookie.value));
      });
    },
    {
      validate: () => {
        cy.request(afterLoginLocation).its('status').should('eq', 200);
        cy.visit(afterLoginLocation);        
      },
    });
    cy.visit(afterLoginLocation);
    
}

Before({ tags: '@loginAsIDIR' }, function () {  
  doLogin(this, 'idir','/search');
  cy.waitForPageLoad('.cds--header__name');
});

Before({ tags: '@loginAsBCeID' }, function () {  
  doLogin(this, 'bceid','/search');
  cy.waitForPageLoad('.cds--header__name');
});