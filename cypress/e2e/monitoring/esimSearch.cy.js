Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('ResizeObserver')) {
    return false;
  }
});

describe('Esim search flow', { pageLoadTimeout: 120000 }, () => {
  it('Авторизация и поиск E-SIM по стране Турция', () => {
    cy.viewport(1280, 800);
    cy.intercept('POST', '**/login**').as('apiAuth');
    cy.intercept('POST', '**/api/esim/search**').as('apiSearch');

    cy.writeFile('api_status.txt', 'UNKNOWN');
    cy.writeFile('offers_count.txt', 'N/A');

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
    cy.wait(1500);
    cy.get('ul[role="listbox"] li, ul.p-autocomplete-items li, li.p-autocomplete-option', { timeout: 20000 })
      .contains(/Турция/i)
      .first()
      .should('be.visible')
      .click({ force: true });

    cy.log('Нажимаем кнопку поиска');
    cy.wait(1500);
    cy.get('button[data-testid="search-button"], button[aria-label*="Поиск"], button[aria-label*="search"], button[class*="search"], button[class*="submit"]', { timeout: 20000 })
      .filter(':visible')
      .first()
      .should('be.visible')
      .click({ force: true });

    cy.log('Ожидаем завершения запроса поиска');
    cy.wait('@apiSearch', { timeout: 45000 }).then((interception) => {
      const status = interception.response?.statusCode || 0;
      cy.writeFile('api_status.txt', `${status}`);
    });

    cy.log('Ждём результаты E-SIM и считаем офферы');
    cy.get('article.offer-card, .offer-card', { timeout: 30000 })
      .should('have.length.greaterThan', 0)
      .then(($cards) => {
        const count = $cards.length;
        cy.log(`Найдено офферов: ${count}`);
        cy.writeFile('offers_count.txt', `${count}`);
      });
  });
});