Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('ResizeObserver')) {
    return false;
  }
});

describe('Esim search flow', { pageLoadTimeout: 120000 }, () => {
  it('Авторизация и поиск E-SIM по стране Турция', () => {
    cy.viewport(1280, 800);
    cy.intercept('POST', '**/login**').as('apiAuth');
    cy.intercept('POST', '**/api/**').as('apiRequest');

    cy.clearCookies();
    cy.clearLocalStorage();
    cy.window().then((win) => win.sessionStorage.clear());

    cy.visit('/');

    cy.env(['LOGIN_EMAIL', 'LOGIN_PASSWORD']).then((envVars) => {
      cy.get('input[type="text"], input[type="email"]', { timeout: 20000 })
        .first()
        .should('be.visible')
        .focus()
        .type(`{selectall}{backspace}${envVars.LOGIN_EMAIL}`, { delay: 50, log: false });

      cy.get('input[type="password"]', { timeout: 20000 })
        .should('be.visible')
        .focus()
        .type(`{selectall}{backspace}${envVars.LOGIN_PASSWORD}`, { delay: 50, log: false });

      cy.get('button[type="submit"], button')
        .contains(/Войти|Sign in|Login/i)
        .click({ force: true });
    });

    cy.wait('@apiAuth', { timeout: 30000 }).then((interception) => {
      const status = interception.response?.statusCode || 500;
      if (status >= 400) {
        throw new Error(`Auth failed: ${status}`);
      }
    });

    cy.url({ timeout: 30000 }).should('not.include', '/sign-in');

    cy.visit('https://b2b.metatrip.asia/esim/ru');
    cy.url({ timeout: 30000 }).should('include', '/esim/ru');

    cy.log('Вводим страну Турция в поле E-SIM');
    cy.get('input[placeholder="Выберите страну"], input[placeholder*="страна"], input[aria-label*="страна"]', { timeout: 20000 })
      .first()
      .should('be.visible')
      .click({ force: true })
      .clear()
      .type('Турция', { delay: 50 });

    cy.log('Выбираем первую страну из автодополнения');
    cy.get('ul[role="listbox"] li, ul.p-autocomplete-items li, li.p-autocomplete-option', { timeout: 20000 })
      .contains(/Турция/i)
      .first()
      .should('be.visible')
      .click({ force: true });

    cy.log('Нажимаем кнопку поиска');
    cy.wait(1000);
    cy.get('button.esim-search__submit, .app-button.esim-search__submit, button[class*="esim-search__submit"], button[aria-label*="Поиск"], button[aria-label*="search"], button[type="submit"]', { timeout: 20000 })
      .filter(':visible')
      .first()
      .should('be.visible')
      .click({ force: true });

    cy.log('Ожидаем завершения запроса поиска');
    cy.wait('@apiRequest', { timeout: 45000 });

    cy.log('Проверяем, что результаты поиска отображаются');
    cy.get('body', { timeout: 30000 }).should(($body) => {
      expect($body.text()).to.match(/Турция|E-SIM|сим-карта|оператор|стоимость/i);
    });
  });
});