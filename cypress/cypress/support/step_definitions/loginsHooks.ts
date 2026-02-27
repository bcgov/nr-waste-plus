import { Before, Step } from '@badeball/cypress-cucumber-preprocessor';

const doLogin = (context: Mocha.Context, kind: string, afterLoginLocation: string) => {

  cy.env([`${kind}_username`, `${kind}_password`]).then((envVars) => {
    const username = envVars[`${kind}_username`];
    const password = envVars[`${kind}_password`];

    if(!username || !password) {
      throw new Error(`Username or password for ${kind} not found.`);
    }
    
    cy.session(
      `${kind}-${username}`,
      () => {
        // Visit the landing page
        Step(context, `I visit "/"`);
        cy.waitForPageLoad('img');
        Step(context, 'I can read "Waste Plus"');
        
        // Click on the login button
        if(kind !== 'bceid' && kind !== 'bcsc') {
          Step(context, 'I click on the "Log in with IDIR" button');
        } else if(kind === 'bceid') {
          Step(context, 'I click on the "Log in with Business BCeID" button');
        }

        cy.origin(
          //Logontest is used here as this automation will only run on dev/test
          'https://logontest7.gov.bc.ca', 
          { args: { username, password } }, 
          ({ username, password }) => {
          // Log into the application, not using a step here to prevent password spillage
          cy.get("#user").type(username, { log: false });
          cy.get("#password").type(password, { log: false });
          cy.contains('input[type="submit"]', 'Continue').click();
        });

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
  });
}

Before({ tags: '@loginAsIDIR' }, function () {  
  doLogin(this, 'idir','/search');
  cy.waitForPageLoad('.cds--header__name');
});

Before({ tags: '@loginAsBCeID' }, function () {  
  doLogin(this, 'bceid','/search');
  cy.waitForPageLoad('.cds--header__name');
});