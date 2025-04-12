document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;

    // 1. --- Проверка и инициализация Telegram WebApp ---
    if (!tg || !tg.initDataUnsafe) { // Проверяем и initDataUnsafe на всякий случай
        console.error("Telegram WebApp script not loaded or init data unavailable!");
        document.body.innerHTML = '<div style="color: red; background-color: #333; border-radius: 8px; padding: 20px; margin: 20px; text-align: center; font-family: sans-serif;">Ошибка: Не удалось загрузить приложение Telegram.<br>Пожалуйста, убедитесь, что вы открываете его внутри Telegram.</div>';
        return;
    }
    console.log("Telegram WebApp Initialized. initDataUnsafe:", tg.initDataUnsafe);

    tg.ready();
    tg.expand();

    tg.setHeaderColor('#1c1c1e')

    // 2. --- Получение элементов DOM ---
    const pages = document.querySelectorAll('.page');
    const navButtons = document.querySelectorAll('.nav-btn');
    const countdownElement = document.getElementById('countdown');
    const referralLinkInput = document.getElementById('referral-link');
    const copyButton = document.getElementById('copy-button'); // Убедитесь, что ID кнопки в HTML = "copy-button"
    const copyStatusElement = document.getElementById('copy-status'); // Убедитесь, что ID элемента статуса = "copy-status"
    const referralCountElement = document.getElementById('referral-count');
    const bodyElement = document.body;
    const loadingIndicator = document.getElementById('loading-indicator'); // Добавьте индикатор загрузки в HTML (опционально)

    // 3. --- Получение конфигурации (имя бота) ---
    const botUsername = bodyElement.dataset.botUsername;
    if (!botUsername || botUsername === "ИМЯ_ВАШЕГО_БОТА_ЗДЕСЬ") {
        console.error("Bot username is not set in body data-bot-username attribute!");
        // Критическая ошибка - без имени бота ссылка не сгенерируется
        if (referralLinkInput) {
            referralLinkInput.value = "Ошибка конфигурации!";
            referralLinkInput.placeholder = "Ошибка конфигурации!";
        }
        // Возможно, стоит показать ошибку пользователю более явно
    }

    // 4. --- Навигация ---
    function showPage(pageId) {
        pages.forEach(p => p.classList.remove('active'));
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        } else {
            console.error(`Page with id "${pageId}-page" not found!`);
        }

        navButtons.forEach(btn => {
            const isActive = btn.dataset.page === pageId;
            btn.classList.toggle('active', isActive);
            // Пример смены картинки (если используется)
            const img = btn.querySelector('img');
            if (img && img.dataset.activeSrc && img.dataset.inactiveSrc) {
                 img.src = isActive ? img.dataset.activeSrc : img.dataset.inactiveSrc;
            }
        });
        window.scrollTo(0, 0);
    }

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const pageId = button.dataset.page;
            if (pageId) {
                showPage(pageId);
            }
        });
    });

    // Активируем начальную страницу (если она задана в HTML)
    // const initialActivePage = document.querySelector('.page.active')?.id.replace('-page', '');
    // if (initialActivePage) showPage(initialActivePage); // Можно раскомментировать, если нужно

    // 5. --- Таймер ---
    let timerInterval = null;
    function updateTimer() {
        if (!countdownElement) return;
        // ... (ваш код таймера остается без изменений) ...
        const targetDate = new Date('2025-04-03T12:00:00').getTime();
        const now = new Date().getTime();
        const diff = targetDate - now;

        if (diff <= 0) {
            countdownElement.innerHTML = "Время вышло!";
             if(timerInterval) clearInterval(timerInterval); // Остановить интервал
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        const format = (num) => String(num).padStart(2, '0');
        countdownElement.innerHTML = `
            <div class="time-unit">${format(days)}</div>:
            <div class="time-unit">${format(hours)}</div>:
            <div class="time-unit">${format(minutes)}</div>:
            <div class="time-unit">${format(seconds)}</div>
        `; // Добавлен класс для возможной стилизации
    }

    if (countdownElement) {
       timerInterval = setInterval(updateTimer, 1000);
       updateTimer();
    }

    // 6. --- Реферальная система ---
    function generateReferralLink() {
        if (!tg.initDataUnsafe?.user?.id || !referralLinkInput) {
            console.error("User data or referral input element not available.");
            if(referralLinkInput) referralLinkInput.value = "Ошибка данных";
            return;
        }
        if (!botUsername || botUsername === "ИМЯ_ВАШЕГО_БОТА_ЗДЕСЬ") {
             console.error("Bot username not configured for referral link!");
             referralLinkInput.value = "Ошибка ссылки";
             return; // Не генерируем ссылку без имени бота
        }

        const userId = tg.initDataUnsafe.user.id;
        const link = `https://t.me/${botUsername}?start=user_${userId}`;
        referralLinkInput.value = link;
        console.log("Generated referral link:", link);
    }

    if (referralLinkInput) {
        generateReferralLink();
    }

    // --- Функция для получения данных пользователя с бэкенда ---
    async function fetchUserData() {
        // Показываем индикатор загрузки, если он есть
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        if (referralCountElement) referralCountElement.textContent = '...'; // Показываем загрузку

        if (!tg.initData) {
            console.error("Telegram initData is not available for API request.");
            if (referralCountElement) referralCountElement.textContent = 'Ошибка!';
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            // Можно показать пользователю сообщение об ошибке
            return;
        }

        try {
            console.log("Fetching user data from /api/user/me");
            const response = await fetch('/api/user/me', { // Путь к вашему API
                method: 'GET',
                headers: {
                    // Отправляем InitData для валидации на бэкенде
                    'X-Telegram-Init-Data': tg.initData
                }
            });

            // Прячем индикатор загрузки
             if (loadingIndicator) loadingIndicator.style.display = 'none';

            if (!response.ok) {
                // Получаем текст ошибки с сервера, если он есть
                let errorDetail = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorDetail = errorData.detail || errorDetail;
                } catch (e) {
                    // Не удалось распарсить JSON ошибки
                }
                console.error('API Error:', errorDetail);
                if (referralCountElement) referralCountElement.textContent = 'Ошибка!';
                // Можно показать пользователю более детальную ошибку, если нужно
                throw new Error(errorDetail); // Выбрасываем ошибку, чтобы остановить выполнение
            }

            // Успешно получили данные
            const data = await response.json();
            console.log('Received user data:', data);

            // Обновляем счетчик рефералов
            if (referralCountElement) {
                referralCountElement.textContent = data.referral_count !== undefined ? data.referral_count : 'N/A';
            }

            // Можно обновить и другие элементы, если API возвращает больше данных
            // Например: document.getElementById('user-name').textContent = data.first_name;

        } catch (error) {
            console.error('Failed to fetch user data:', error);
            if (referralCountElement) referralCountElement.textContent = 'Ошибка!';
            if (loadingIndicator) loadingIndicator.style.display = 'none';
             // Здесь можно показать пользователю сообщение, что не удалось загрузить данные
        }
    }

    // Загружаем данные пользователя при инициализации
    fetchUserData();


    // 7. --- Копирование в буфер обмена ---
    async function copyToClipboard() {
        if (!referralLinkInput || !copyButton || !copyStatusElement) {
             console.error("Copy elements not found!");
             return;
        }
        const linkToCopy = referralLinkInput.value;

        // Сбрасываем предыдущий статус
        copyStatusElement.textContent = '';
        copyButton.style.backgroundColor = '';

        if (!linkToCopy || linkToCopy.startsWith("Ошибка")) {
            copyStatusElement.textContent = 'Нечего копировать';
            return;
        }

        if (!navigator.clipboard) {
            // Fallback для старых браузеров или HTTP
            try {
                referralLinkInput.select();
                referralLinkInput.setSelectionRange(0, 99999); // Для мобильных
                document.execCommand('copy');
                copyStatusElement.textContent = 'Скопировано!';
                copyButton.style.backgroundColor = '#28a745';
                 setTimeout(() => {
                    copyStatusElement.textContent = '';
                    copyButton.style.backgroundColor = '';
                 }, 2000);
            } catch (err) {
                console.error('Fallback copy failed:', err);
                copyStatusElement.textContent = 'Ошибка копирования';
                copyButton.style.backgroundColor = '#dc3545';
                 setTimeout(() => {
                    copyStatusElement.textContent = '';
                    copyButton.style.backgroundColor = '';
                 }, 2000);
            }
            return;
        }

        // Современный API
        try {
            await navigator.clipboard.writeText(linkToCopy);
            copyStatusElement.textContent = 'Ссылка скопирована!';
            copyButton.style.backgroundColor = '#28a745'; // Зеленый
        } catch (err) {
            console.error('Failed to copy text: ', err);
            copyStatusElement.textContent = 'Ошибка копирования!';
            copyButton.style.backgroundColor = '#dc3545'; // Красный
        } finally {
             // Убираем сообщение и цвет через 2 секунды
             setTimeout(() => {
                copyStatusElement.textContent = '';
                copyButton.style.backgroundColor = '';
            }, 2000);
        }
    }

    if (copyButton) {
        copyButton.addEventListener('click', copyToClipboard);
    }

}); // Конец DOMContentLoaded