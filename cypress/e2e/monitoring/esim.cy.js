describe('eSIM Product', () => {

  before(() => {
    // Очищаем файлы перед стартом, как в Avia
    cy.writeFile('api_status.txt', 'UNKNOWN');
    cy.writeFile('offers_count.txt', 'N/A');
  });

  it('Search Flow - eSIM with Smart Diagnostic', () => {
    cy.viewport(1280, 800);
    
    // 1. ПЕРЕХВАТ API (eSIM)
    cy.intercept({ method: 'POST', url: '**/esim/offers**' }).as('esimSearch');

    // 2. ЛОГИН 
    cy.visit('https://test.globaltravel.space/sign-in'); 

    cy.xpath("(//input[contains(@class,'input')])[1]")
      .should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .should('be.visible')
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false })
      .type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    cy.get('body').should('not.contain', 'Ошибка');

    // 3. ПЕРЕХОД В ESIM
    cy.visit('https://test.globaltravel.space/esim');
    cy.url().should('include', '/esim');

    // 4. ВЫБОР СТРАНЫ
    cy.get('input#v-1').should('be.visible').click({ force: true }).clear();
    cy.get('input#v-1').type('Турция', { delay: 100 });
    
    cy.wait(1000); // Даем время на подгрузку дропдауна
    
    cy.get('.p-listbox-item', { timeout: 10000 })
      .contains(/Турция/i)
      .click({ force: true });

    // 5. ПОИСК
    cy.get('button.form-btn').should('be.visible').click({ force: true });

    // 6. УМНАЯ ПРОВЕРКА API (как в Avia)
    cy.wait('@esimSearch', { timeout: 30000 }).then((interception) => {
      const statusCode = interception.response?.statusCode || 500;
      cy.writeFile('api_status.txt', statusCode.toString());

      if (statusCode >= 400) {
        cy.writeFile('offers_count.txt', 'ERROR');
        throw new Error(`🆘 Ошибка сервера API eSIM: HTTP ${statusCode}`);
      }
    });

    // Ждем рендера карточек
    cy.wait(15000);

    // 7. ПОДСЧЕТ РЕАЛЬНЫХ ОФФЕРОВ В UI (как в Avia)
    cy.get('body').then(($body) => {
      // Используем класс офферов из вашего сниппета eSIM
      const allCards = $body.find('[class*="offer"]');
      let realOffersCount = 0;

      allCards.each((index, el) => {
        const cardText = Cypress.$(el).text();
        // Проверяем наличие типичных слов для готовой к покупке карточки
        if (cardText.includes('Купить') || cardText.includes('Выбрать') || cardText.includes('UZS') || cardText.includes('сум')) {
          realOffersCount++;
        }
      });

      if (realOffersCount > 0) {
        cy.writeFile('offers_count.txt', realOffersCount.toString());
        cy.log(`✅ Найдено реальных eSIM: ${realOffersCount}`);
      } else {
        cy.writeFile('offers_count.txt', '0');
        cy.log('⚪ eSIM не найдены (или долгая загрузка)');
      }
    });
  });
});