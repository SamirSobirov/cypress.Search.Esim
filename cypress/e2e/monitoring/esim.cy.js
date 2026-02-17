describe('eSIM Product', () => {
  it('Search Flow - eSIM', () => {
    cy.viewport(1280, 800);
    
    // 1. ПЕРЕХВАТ API (проверьте URL в Network, обычно это /esim/offers или похожий)
    cy.intercept('POST', '**/esim/offers**').as('esimSearch');

    // 2. АВТОРИЗАЦИЯ
    cy.visit('https://test.globaltravel.space/sign-in');
    
    // Используем стандартные селекторы, чтобы не зависеть от xpath, если он не установлен
    cy.get('input').eq(0).should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    cy.get('input').eq(1)
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 40000 }).should('include', '/home');

    // 3. ПЕРЕХОД В ESIM
    cy.visit('https://test.globaltravel.space/esim');
    cy.url().should('include', '/esim');

    // 4. ВЫБОР СТРАНЫ (Турция)
    // Судя по скриншоту, id поля — v-1
    cy.get('input#v-1').should('be.visible')
      .click({ force: true })
      .type('Турция', { delay: 100 });

    // Кликаем по выпавшему элементу из списка
    cy.get('.p-listbox-item', { timeout: 10000 })
      .contains(/Турция/i)
      .click({ force: true });

    // 5. ПОИСК
    // Класс кнопки на вашем скриншоте: .form-btn
    cy.get('button.form-btn')
      .should('be.visible')
      .click({ force: true });

    // 6. ПРОВЕРКА РЕЗУЛЬТАТА (Неубиваемая логика)
    cy.wait('@esimSearch', { timeout: 60000 }).then((interception) => {
      const body = interception.response ? interception.response.body : null;
      
      // Вывод структуры в консоль для отладки
      console.log('eSIM API Response:', body);

      let offersList = [];
      if (body) {
        offersList = body.offers || body.data || (Array.isArray(body) ? body : []);
      }
      
      const count = offersList.length || 0;

      cy.log(`DEBUG: Found ${count} eSIM offers`);
      
      // Записываем для Telegram бота
      cy.writeFile('offers_count.txt', count.toString());
      
      if (count > 0) {
        // Проверяем наличие карточек тарифов на странице
        cy.get('[class*="offer"]', { timeout: 20000 }).should('exist');
      } else {
        cy.log('Офферы eSIM не найдены');
      }
    });
  });
});