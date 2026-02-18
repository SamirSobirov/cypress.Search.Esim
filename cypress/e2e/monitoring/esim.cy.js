describe('eSIM Product', () => {
  it('Search Flow - eSIM', () => {
    cy.viewport(1280, 800);
    
    // 1. ПЕРЕХВАТ API 
    cy.intercept('POST', '**/esim/offers**').as('esimSearch');

  // 1. ЛОГИН 
    cy.visit('https://test.globaltravel.space/sign-in'); 

    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    
    cy.get('body').should('not.contain', 'Ошибка');

    // 3. ПЕРЕХОД В ESIM
    cy.visit('https://test.globaltravel.space/esim');
    cy.url().should('include', '/esim');

    // 4. ВЫБОР СТРАНЫ
    cy.get('input#v-1').should('be.visible')
      .click({ force: true })
      .type('Турция', { delay: 100 });

    cy.get('.p-listbox-item', { timeout: 10000 })
      .contains(/Турция/i)
      .click({ force: true });

    // 5. ПОИСК
    cy.get('button.form-btn')
      .should('be.visible')
      .click({ force: true });

    // 6. ПРОВЕРКА РЕЗУЛЬТАТА 
    cy.wait('@esimSearch', { timeout: 60000 }).then((interception) => {
      const body = interception.response ? interception.response.body : null;
      
      console.log('eSIM API Response:', body);

      let offersList = [];
      if (body) {
        offersList = body.offers || body.data || (Array.isArray(body) ? body : []);
      }
      
      const count = offersList.length || 0;

      cy.log(`DEBUG: Found ${count} eSIM offers`);
      
      cy.writeFile('offers_count.txt', count.toString());
      
      if (count > 0) {
        cy.get('[class*="offer"]', { timeout: 20000 }).should('exist');
      } else {
        cy.log('Офферы eSIM не найдены');
      }
    });
  });
});