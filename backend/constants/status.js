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

module.exports = {
  STATUSES,
  STATUS
}; 