function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

function formatDateTime(input) {
  if (!input) {
    return '';
  }

  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    return input;
  }

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function getTodayRange() {
  const today = formatDate(new Date());
  return {
    startDate: today,
    endDate: today,
  };
}

function normalizeDateRange(startDate, endDate) {
  const today = getTodayRange().startDate;
  const normalizedStartDate = startDate || today;
  const normalizedEndDate = endDate || normalizedStartDate;

  return {
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
  };
}

function buildTenderListPath(startDate, endDate) {
  return `/pages/tender-list/index?startDate=${startDate}&endDate=${endDate}`;
}

module.exports = {
  buildTenderListPath,
  formatDate,
  formatDateTime,
  getTodayRange,
  normalizeDateRange,
};
