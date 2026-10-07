// 生成例假日的函數
function generateWeekends(year) {
    const weekends = [];
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) { // 週日(0)或週六(6)
            const dateStr = formatDate(date);
            const dayName = dayOfWeek === 0 ? '星期日' : '星期六';
            weekends.push({
                date: dateStr,
                name: dayName,
                type: 'weekend',
                description: '例假日'
            });
        }
    }

    return weekends;
}

// 台灣休假日資料快取
const taiwanHolidaysCache = {};

// API 基礎 URL
const API_BASE_URL = 'https://api.pin-yi.me/taiwan-calendar';

// 使用 jQuery 的 AJAX 方法從本地 API 取得假日資料（如果需要）
let holiday_data = [];

async function GetHoliday(year) {
    try {
        const response = await fetch(`./${year}.json`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        taiwanHolidaysCache[year] = data;

        return data;

    } catch (error) {
        console.error(`讀取 ${year} 假日資料失敗`, error);
        return [];
    }

}

// 從 API 取得台灣休假日資料
async function fetchTaiwanHolidays(year) {
    

    try {
        showLoadingState(true);


        let data = [];
        // 檢查快取
        if (taiwanHolidaysCache[year]) {
            data = taiwanHolidaysCache[year];
        }
        else {
            holiday_data = await GetHoliday(year);
            

            // 轉換 API 資料格式為我們需要的格式
            const holidays = holiday_data.map(item => {
                // 將 YYYYMMDD 格式轉換為 YYYY-MM-DD 格式
                const dateStr = item.date;
                const formattedDate = dateStr.length === 8 ?
                    `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}` :
                    dateStr;
                const the_name = getHolidayDescription(item)

                return {
                    date: formattedDate,
                    name: the_name,
                    type: getHolidayType(item),
                    description: the_name,
                    isHoliday: item.isHoliday
                };
            }).filter(item => item.isHoliday); // 只保留假日.filter(item => item.isHoliday)

            data = holidays;
        }

        

        

        // 快取資料
        taiwanHolidaysCache[year] = data;

        return data;

    } catch (error) {
        console.error('取得台灣休假日資料失敗:', error);
        showErrorMessage(`無法取得 ${year} 年的休假日資料: ${error.message}`);
        return [];
    } finally {
        showLoadingState(false);
    }
}

// 判斷假日類型
function getHolidayType(obj_data) {
    if (obj_data.week_chinese === '六' && obj_data.isHoliday && obj_data.caption === '') {
        return 'weekend';
    }
    else if (obj_data.week_chinese === '日' && obj_data.isHoliday && obj_data.caption === '') {
        return 'weekend';
    }
    else {
        return 'national';
    }
}

// 取得假日描述
function getHolidayDescription(obj_data) {
    if (obj_data.week_chinese === '六' && obj_data.isHoliday && obj_data.caption === '') {
        return '星期六';
    }
    else if (obj_data.week_chinese === '日' && obj_data.isHoliday && obj_data.caption === '') {
        return '星期日';
    }
    else {
        return obj_data.caption;
    }
}

// 顯示載入狀態
function showLoadingState(show) {
    const loadingElement = document.getElementById('loadingIndicator');
    if (loadingElement) {
        if (show) {
            loadingElement.classList.remove('hidden');
        } else {
            loadingElement.classList.add('hidden');
        }
    }
}

// 顯示錯誤訊息
function showErrorMessage(message) {
    const errorElement = document.getElementById('errorMessage');
    const errorTextElement = errorElement?.querySelector('.error-text');

    if (errorElement && errorTextElement) {
        errorTextElement.textContent = message;
        errorElement.classList.remove('hidden');

        // 3秒後自動隱藏錯誤訊息
        setTimeout(() => {
            errorElement.classList.add('hidden');
        }, 3000);
    } else {
        console.error(message);
    }
}

// 全域變數
let currentYear = new Date().getFullYear();
let currentView = 'month';
let filteredHolidays = [];
let showWeekends = true; // 控制是否顯示例假日

// 獲取合併後的休假日資料
async function getAllHolidays(year) {
    const holidays = await fetchTaiwanHolidays(year);
    return holidays;
}

// 預設的值班日設定
const customDutyDays = {
    '2024-12-28': { isDuty: true, dutySequence: 1, note: '指定值班日' },
    '2025-10-12': { isDuty: true, dutySequence: 1, note: '指定值班日' },
    '2026-01-01': { isDuty: true, dutySequence: 1, note: '指定值班日' },
	'2027-01-01': { isDuty: true, dutySequence: 1, note: '指定值班日' }
};

// 計算值班日期
async function calculateDutyDays(year) {
    const allHolidays = await getAllHolidays(year);
    const dutyDays = [];

    const sortedHolidays = [...allHolidays].sort((a, b) => new Date(a.date) - new Date(b.date));
    const hasCustomDuty = sortedHolidays.some(holiday => customDutyDays[holiday.date]);

    if (hasCustomDuty) {
        // 拿到預設 duty date 與其序號
        const customDateStr = Object.keys(customDutyDays)[0];
        const customDate = new Date(customDateStr);
        const baseDutySeq = customDutyDays[customDateStr].dutySequence;

        let dutySeqMap = { [customDateStr]: baseDutySeq }; // 記錄所有 dutySequence

        sortedHolidays.forEach(holiday => {
            const dateStr = holiday.date;
            const hDate = new Date(dateStr);

            if (customDutyDays[dateStr]) {
                // 預設值班日
                dutyDays.push({
                    ...holiday,
                    isDuty: true,
                    dutySequence: customDutyDays[dateStr].dutySequence,
                    note: customDutyDays[dateStr].note
                });
            } else {
                const isDuty = shouldBeDutyDay(holiday, sortedHolidays, customDutyDays);
                if (isDuty) {
                    const delta = getHolidayDeltaFromBase(holiday, sortedHolidays, customDate);
                    const dutySequence = baseDutySeq + Math.sign(delta) * Math.floor(Math.abs(delta) / 5);

                    dutyDays.push({
                        ...holiday,
                        isDuty: true,
                        dutySequence: dutySequence,
                        note: '規則計算'
                    });

                    dutySeqMap[dateStr] = dutySequence;
                } else {
                    dutyDays.push({
                        ...holiday,
                        isDuty: false
                    });
                }
            }
        });
    } else {
        // 無自定義，按原規則每 5 個排一次
        let holidayCount = 0;

        sortedHolidays.forEach(holiday => {
            holidayCount++;
            if (holidayCount % 5 === 0) {
                dutyDays.push({
                    ...holiday,
                    isDuty: true,
                    dutySequence: Math.floor(holidayCount / 5)
                });
            } else {
                dutyDays.push({
                    ...holiday,
                    isDuty: false
                });
            }
        });
    }

    return dutyDays;
}

function getHolidayDeltaFromBase(currentHoliday, allHolidays, baseDate) {
    const currentDate = new Date(currentHoliday.date);

    const holidaysInBetween = allHolidays.filter(h => {
        const hDate = new Date(h.date);
        return (hDate <= currentDate && hDate > baseDate) || (hDate >= currentDate && hDate < baseDate);
    });

    return holidaysInBetween.length * (currentDate > baseDate ? 1 : -1);
}

// 判斷是否應該設為值班日
function shouldBeDutyDay(holiday, allHolidays, customDutyDays) {
    const currentDate = new Date(holiday.date);
    const customDutyDates = Object.keys(customDutyDays).map(date => new Date(date));

    if (customDutyDates.length === 0) return false;

    // 找到離當前日期最近的「預設值班日」
    const nearestCustomDuty = customDutyDates
        .sort((a, b) => Math.abs(currentDate - a) - Math.abs(currentDate - b))[0];

    if (!nearestCustomDuty) return false;

    const isAfter = currentDate > nearestCustomDuty;

    const holidaysInRange = allHolidays.filter(h => {
        const hDate = new Date(h.date);
        if (isAfter) {
            return hDate > nearestCustomDuty && hDate <= currentDate;
        } else {
            return hDate < nearestCustomDuty && hDate >= currentDate;
        }
    });

    return holidaysInRange.length % 5 === 0 && holidaysInRange.length > 0;
}

// DOM 元素
const elements = {
    currentYear: document.getElementById('currentYear'),
    prevYear: document.getElementById('prevYear'),
    nextYear: document.getElementById('nextYear'),
    searchInput: document.getElementById('searchInput'),
    monthView: document.getElementById('monthView'),
    listView: document.getElementById('listView'),
    dutyView: document.getElementById('dutyView'),
    showWeekends: document.getElementById('showWeekends'),
    monthCalendar: document.getElementById('monthCalendar'),
    listCalendar: document.getElementById('listCalendar'),
    dutyCalendar: document.getElementById('dutyCalendar'),
    dutyList: document.getElementById('dutyList'),
    calendarTitle: document.getElementById('calendarTitle'),
    totalHolidays: document.getElementById('totalHolidays'),
    nationalHolidays: document.getElementById('nationalHolidays'),
    traditionalHolidays: document.getElementById('traditionalHolidays'),
    weekendHolidays: document.getElementById('weekendHolidays'),
    dutyHolidays: document.getElementById('dutyHolidays'),
    holidayModal: document.getElementById('holidayModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalDate: document.getElementById('modalDate'),
    modalType: document.getElementById('modalType'),
    modalDescription: document.getElementById('modalDescription'),
    closeModal: document.getElementById('closeModal')
};

// 初始化應用程式
async function init() {
    setupEventListeners();
    updateYear();
    await renderCalendar();
    await updateStats();
}

// 設置事件監聽器
function setupEventListeners() {
    elements.prevYear.addEventListener('click', async () => {
        currentYear--;
        updateYear();
        await renderCalendar();
        await updateStats();
    });

    elements.nextYear.addEventListener('click', async () => {
        currentYear++;
        updateYear();
        await renderCalendar();
        await updateStats();
    });

    elements.searchInput.addEventListener('input', handleSearch);

    elements.monthView.addEventListener('click', () => switchView('month'));
    elements.listView.addEventListener('click', () => switchView('list'));
    elements.dutyView.addEventListener('click', () => switchView('duty'));

    elements.showWeekends.addEventListener('change', async (e) => {
        showWeekends = e.target.checked;
        await renderCalendar();
        await updateStats();
    });

    elements.closeModal.addEventListener('click', closeModal);
    elements.holidayModal.addEventListener('click', (e) => {
        if (e.target === elements.holidayModal) {
            closeModal();
        }
    });

    // 鍵盤事件
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// 更新年份顯示
function updateYear() {
    elements.currentYear.textContent = currentYear;
    elements.calendarTitle.textContent = `${currentYear}年行事曆`;
}

// 處理搜尋
async function handleSearch() {
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    const yearHolidays = await calculateDutyDays(currentYear);

    if (searchTerm === '') {
        filteredHolidays = yearHolidays;
    } else {
        filteredHolidays = yearHolidays.filter(holiday =>
            holiday.name.toLowerCase().includes(searchTerm) ||
            holiday.description.toLowerCase().includes(searchTerm) ||
            (holiday.isDuty && '值班'.includes(searchTerm))
        );
    }

    await renderCalendar();
    await updateStats();
}

// 切換檢視模式
async function switchView(view) {
    currentView = view;

    // 更新按鈕狀態
    elements.monthView.classList.toggle('active', view === 'month');
    elements.listView.classList.toggle('active', view === 'list');
    elements.dutyView.classList.toggle('active', view === 'duty');

    // 顯示/隱藏對應的檢視
    elements.monthCalendar.classList.toggle('hidden', view !== 'month');
    elements.listCalendar.classList.toggle('hidden', view !== 'list');
    elements.dutyCalendar.classList.toggle('hidden', view !== 'duty');

    await renderCalendar();
}

// 渲染行事曆
async function renderCalendar() {
    const yearHolidays = filteredHolidays.length > 0 ? filteredHolidays : await calculateDutyDays(currentYear);

    if (currentView === 'month') {
        renderMonthView(yearHolidays);
    } else if (currentView === 'list') {
        renderListView(yearHolidays);
    } else if (currentView === 'duty') {
        renderDutyView(yearHolidays);
    }
}

// 渲染月份檢視
function renderMonthView(holidays) {
    const months = [
        '一月', '二月', '三月', '四月', '五月', '六月',
        '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];

    elements.monthCalendar.innerHTML = '';

    months.forEach((monthName, monthIndex) => {
        const monthNumber = monthIndex + 1;
        const monthHolidays = holidays.filter(holiday => {
            const holidayDate = new Date(holiday.date);
            return holidayDate.getMonth() === monthIndex;
        });

        if (monthHolidays.length > 0) {
            const monthCard = createMonthCard(monthName, monthHolidays);
            elements.monthCalendar.appendChild(monthCard);
        }
    });

    // 如果沒有節日，顯示提示訊息
    if (elements.monthCalendar.children.length === 0) {
        elements.monthCalendar.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 16px;">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p>${elements.searchInput.value ? '沒有找到符合條件的節日' : '這一年沒有休假日資料'}</p>
            </div>
        `;
    }
}

// 創建月份卡片
function createMonthCard(monthName, holidays) {
    const monthCard = document.createElement('div');
    monthCard.className = 'month-card';

    const title = document.createElement('h3');
    title.className = 'month-title';
    title.textContent = monthName;
    monthCard.appendChild(title);

    holidays.forEach(holiday => {
        const holidayItem = createHolidayItem(holiday);
        monthCard.appendChild(holidayItem);
    });

    return monthCard;
}

// 創建節日項目
function createHolidayItem(holiday) {
    const item = document.createElement('div');
    item.className = `holiday-item ${holiday.type} ${holiday.isDuty ? 'duty' : ''}`;

    const date = new Date(holiday.date);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

    const typeText = holiday.type === 'national' ? '國定' :
        holiday.type === 'traditional' ? '傳統' : '例假';

    const dutyBadge = holiday.isDuty ? '<span class="duty-badge">值班</span>' : '';

    item.innerHTML = `
        <span class="holiday-date">${dateStr}</span>
        <span class="holiday-name">${holiday.name}${dutyBadge}</span>
        <span class="holiday-type ${holiday.type}">${typeText}</span>
    `;

    item.addEventListener('click', () => showHolidayDetail(holiday));

    return item;
}

// 渲染列表檢視
function renderListView(holidays) {
    elements.listCalendar.innerHTML = '';

    if (holidays.length === 0) {
        elements.listCalendar.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 16px;">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p>${elements.searchInput.value ? '沒有找到符合條件的節日' : '這一年沒有休假日資料'}</p>
            </div>
        `;
        return;
    }

    // 按日期排序
    const sortedHolidays = [...holidays].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedHolidays.forEach(holiday => {
        const listItem = createListItem(holiday);
        elements.listCalendar.appendChild(listItem);
    });
}

// 創建列表項目
function createListItem(holiday) {
    const item = document.createElement('div');
    item.className = `list-item ${holiday.isDuty ? 'duty' : ''}`;

    const date = new Date(holiday.date);
    const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];

    const typeText = holiday.type === 'national' ? '國定假日' :
        holiday.type === 'traditional' ? '傳統節日' : '例假日';

    const dutyBadge = holiday.isDuty ? '<span class="duty-badge">值班</span>' : '';

    item.innerHTML = `
        <div class="list-date">${dateStr}<br><small>星期${dayOfWeek}</small></div>
        <div class="list-name">${holiday.name}${dutyBadge}</div>
        <div class="holiday-type ${holiday.type}">${typeText}</div>
    `;

    item.addEventListener('click', () => showHolidayDetail(holiday));

    return item;
}

// 渲染值班日檢視
function renderDutyView(holidays) {
    elements.dutyList.innerHTML = '';

    // 篩選出所有值班日
    const dutyDays = holidays.filter(holiday => holiday.isDuty);

    if (dutyDays.length === 0) {
        elements.dutyList.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 16px;">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p>這一年沒有值班日</p>
            </div>
        `;
        return;
    }

    // 按日期排序
    const sortedDutyDays = dutyDays.sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedDutyDays.forEach(holiday => {
        const dutyItem = createDutyItem(holiday);
        elements.dutyList.appendChild(dutyItem);
    });
}

// 創建值班日項目
function createDutyItem(holiday) {
    const item = document.createElement('div');
    item.className = 'duty-item';

    const date = new Date(holiday.date);
    const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];

    item.innerHTML = `
        <div class="duty-date">${dateStr} (星期${dayOfWeek})</div>
        <div class="duty-name">${holiday.name}</div>
        <div class="duty-info">
            <span class="duty-sequence">第${holiday.dutySequence}次值班</span>
            <span class="duty-note">${holiday.note || '規則計算'}</span>
        </div>
    `;

    item.addEventListener('click', () => showHolidayDetail(holiday));

    return item;
}

// 顯示節日詳情
function showHolidayDetail(holiday) {
    const date = new Date(holiday.date);
    const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];

    const typeText = holiday.type === 'national' ? '國定假日' :
        holiday.type === 'traditional' ? '傳統節日' : '例假日';

    const dutyText = holiday.isDuty ? ` (第${holiday.dutySequence}次值班)` : '';
    const dutyNote = holiday.isDuty && holiday.note ? `\n\n📝 備註：${holiday.note}` : '';

    elements.modalTitle.textContent = holiday.name + (holiday.isDuty ? ' - 值班日' : '');
    elements.modalDate.textContent = `${dateStr} (星期${dayOfWeek})`;
    elements.modalType.textContent = typeText + dutyText;
    elements.modalDescription.textContent = holiday.isDuty ?
        `${holiday.description}\n\n⚠️ 此日為值班日，請注意值班安排。${dutyNote}` :
        holiday.description;

    elements.holidayModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// 關閉彈窗
function closeModal() {
    elements.holidayModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// 更新統計資訊
async function updateStats() {
    const yearHolidays = filteredHolidays.length > 0 ? filteredHolidays : await calculateDutyDays(currentYear);

    const total = yearHolidays.length;
    const national = yearHolidays.filter(h => h.type === 'national').length;
    const traditional = yearHolidays.filter(h => h.type === 'traditional').length;
    const weekend = yearHolidays.filter(h => h.type === 'weekend').length;
    const duty = yearHolidays.filter(h => h.isDuty).length;

    // 動畫更新數字
    animateNumber(elements.totalHolidays, total);
    animateNumber(elements.nationalHolidays, national);
    animateNumber(elements.traditionalHolidays, traditional);
    animateNumber(elements.weekendHolidays, weekend);
    animateNumber(elements.dutyHolidays, duty);
}

// 數字動畫
function animateNumber(element, targetNumber) {
    const startNumber = parseInt(element.textContent) || 0;
    const duration = 500;
    const startTime = performance.now();

    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用緩動函數
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentNumber = Math.round(startNumber + (targetNumber - startNumber) * easeOutQuart);

        element.textContent = currentNumber;

        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }

    requestAnimationFrame(updateNumber);
}

// 工具函數：格式化日期
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 工具函數：獲取月份名稱
function getMonthName(monthIndex) {
    const months = [
        '一月', '二月', '三月', '四月', '五月', '六月',
        '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];
    return months[monthIndex];
}

// 工具函數：檢查是否為今天
function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

// 工具函數：檢查是否為過去日期
function isPastDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
}

// 工具函數：檢查是否為未來日期
function isFutureDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
}

// 添加一些互動效果
function addInteractiveEffects() {
    // 為所有可點擊元素添加點擊效果
    document.addEventListener('click', (e) => {
        if (e.target.closest('.holiday-item, .list-item, .nav-btn, .toggle-btn')) {
            const element = e.target.closest('.holiday-item, .list-item, .nav-btn, .toggle-btn');
            element.style.transform = 'scale(0.95)';
            setTimeout(() => {
                element.style.transform = '';
            }, 150);
        }
    });

    // 添加載入動畫
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach(el => {
        el.style.display = 'inline-block';
    });
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    init();
    addInteractiveEffects();

    // 添加頁面載入動畫
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease-in-out';

    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// 處理視窗大小變化
window.addEventListener('resize', async () => {
    // 重新計算佈局（如果需要）
    if (currentView === 'month') {
        const yearHolidays = filteredHolidays.length > 0 ? filteredHolidays : await calculateDutyDays(currentYear);
        renderMonthView(yearHolidays);
    }
});

// 導出函數供調試使用
window.TaiwanHolidayCalendar = {
    currentYear,
    currentView,
    filteredHolidays,
    taiwanHolidaysCache,
    customDutyDays,
    calculateDutyDays,
    fetchTaiwanHolidays,
    switchView,
    updateYear,
    renderCalendar,
    updateStats,
    checkDutyStatus,
    listAllDutyDays,
    listAllYearsDutyDays,
};

// 調試函數：檢查特定日期的值班狀態
async function checkDutyStatus(date) {
    const year = new Date(date).getFullYear();
    const dutyDays = await calculateDutyDays(year);
    const targetDay = dutyDays.find(day => day.date === date);

    if (targetDay) {
        console.log(`${date} 的值班狀態:`, {
            name: targetDay.name,
            isDuty: targetDay.isDuty,
            dutySequence: targetDay.dutySequence,
            note: targetDay.note
        });
    } else {
        console.log(`${date} 不是休假日`);
    }

    return targetDay;
}

// 調試函數：列出所有值班日
async function listAllDutyDays(year) {
    const dutyDays = await calculateDutyDays(year);
    const dutyOnly = dutyDays.filter(day => day.isDuty);

    console.log(`${year}年的所有值班日:`, dutyOnly.map(day => ({
        date: day.date,
        name: day.name,
        sequence: day.dutySequence,
        note: day.note
    })));

    return dutyOnly;
}

// 列出所有年份的值班日
async function listAllYearsDutyDays() {
    const years = [2024, 2025, 2026];
    const allDutyDays = [];

    console.log('=== 所有年份的值班日總覽 ===');

    for (const year of years) {
        const dutyDays = await calculateDutyDays(year);
        const dutyOnly = dutyDays.filter(day => day.isDuty);

        console.log(`\n${year}年值班日 (共${dutyOnly.length}天):`);
        dutyOnly.forEach(day => {
            const date = new Date(day.date);
            const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
            console.log(`  ${dateStr} (星期${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}) - ${day.name} - 第${day.dutySequence}次值班 (${day.note})`);
        });

        allDutyDays.push(...dutyOnly);
    }

    console.log(`\n總計：${allDutyDays.length}個值班日`);
    return allDutyDays;
}

