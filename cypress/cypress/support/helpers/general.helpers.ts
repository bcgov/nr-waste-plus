
export const waitForPageLoad = (element: string, timeout?: number) => {
  cy.get(element, { timeout: timeout || 10000 }).should('be.visible');
};

export const logAndScreenshot = (message: string) => {
  cy.log(message).then(() => {
    console.log(message);
    cy.screenshot(`log-${Date.now()}`);
  });
}