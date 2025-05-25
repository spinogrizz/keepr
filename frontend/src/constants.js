// Статусы активов в виде единого объекта
const STATUSES = {
  1: {
    name: 'ACTIVE',
    label: 'Активный',
    color: '#28a745' // зеленый
  },
  2: {
    name: 'INACTIVE',
    label: 'Неактивный',
    color: '#6c757d' // серый
  },
  3: {
    name: 'EXPIRED',
    label: 'Истёк',
    color: '#dc3545' // красный
  },
  4: {
    name: 'PENDING',
    label: 'Ожидает',
    color: '#ffc107' // желтый
  },
  5: {
    name: 'MAINTENANCE',
    label: 'Обслуживание',
    color: '#fd7e14' // оранжевый
  },
  6: {
    name: 'DECOMMISSIONED',
    label: 'Списан',
    color: '#343a40' // темно-серый
  }
};

// Константы для удобства
const STATUS = {
  ACTIVE: 1,
  INACTIVE: 2,
  EXPIRED: 3,
  PENDING: 4,
  MAINTENANCE: 5,
  DECOMMISSIONED: 6
};

// Обратный маппинг для получения строкового представления
const STATUS_NAMES = {
  1: 'ACTIVE',
  2: 'INACTIVE', 
  3: 'EXPIRED',
  4: 'PENDING',
  5: 'MAINTENANCE',
  6: 'DECOMMISSIONED'
};

// Русские названия статусов
const STATUS_LABELS = {
  1: 'Активный',
  2: 'Неактивный',
  3: 'Истёк',
  4: 'Ожидает',
  5: 'Обслуживание',
  6: 'Списан'
}; 