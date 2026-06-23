const IOT_MODULE_NAME = 'IoT点位对接';

const roundToDecimals = (value, decimals = 2) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  const factor = 10 ** decimals;
  return Math.round((numericValue + Number.EPSILON) * factor) / factor;
};

const toPositiveNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) return fallback;
  return numericValue;
};

const isIotWorkloadItem = (item) =>
  item && String(item.module1 || '') === IOT_MODULE_NAME;

const hasIotPointIntegrationItems = (iotPointIntegration) =>
  Boolean(iotPointIntegration?.applied_at) &&
  Array.isArray(iotPointIntegration?.generated_items) &&
  iotPointIntegration.generated_items.length > 0;

const buildIotWorkloadItems = (iotPointIntegration, roles = []) => {
  if (!hasIotPointIntegrationItems(iotPointIntegration)) {
    return [];
  }

  const generatedItems = Array.isArray(iotPointIntegration?.generated_items)
    ? iotPointIntegration.generated_items
    : [];
  const fallbackRoleName = roles[0]?.role_name || '';
  const roleNames = new Set(roles.map((role) => role.role_name));

  return generatedItems
    .map((item, index) => {
      const adjustedDays = roundToDecimals(
        toPositiveNumber(item?.adjusted_days),
        1
      );
      if (adjustedDays <= 0) return null;

      const roleName = roleNames.has(item?.role_name)
        ? item.role_name
        : fallbackRoleName;
      if (!roleName) return null;

      const note = item?.adjustment_note
        ? `；调整说明：${item.adjustment_note}`
        : '';

      return {
        id: `iot-${item?.key || index}`,
        module1: IOT_MODULE_NAME,
        module2: item?.package_name || '',
        module3: '手动规模评估',
        description: `${item?.estimate_basis || ''}${note}`,
        workload: adjustedDays,
        [roleName]: adjustedDays
      };
    })
    .filter(Boolean);
};

const calculateIotPointIntegrationTotals = (
  iotPointIntegration,
  roles = [],
  ratingFactor = 1
) => {
  const workloadItems = buildIotWorkloadItems(iotPointIntegration, roles);
  const rolePriceMap = new Map(
    roles.map((role) => [role.role_name, Number(role.unit_price || 0) / 10000])
  );
  const normalizedFactor = Number.isFinite(Number(ratingFactor))
    ? Number(ratingFactor)
    : 1;

  let totalWorkload = 0;
  let totalBaseCost = 0;

  workloadItems.forEach((item) => {
    let itemRoleDays = 0;
    let itemRoleCost = 0;

    roles.forEach((role) => {
      const days = toPositiveNumber(item[role.role_name]);
      itemRoleDays += days;
      itemRoleCost += days * (rolePriceMap.get(role.role_name) || 0);
    });

    totalWorkload += itemRoleDays;
    totalBaseCost += itemRoleCost;
  });

  return {
    workloadItems,
    totalWorkload,
    totalBaseCost,
    totalCost: totalBaseCost * normalizedFactor
  };
};

module.exports = {
  IOT_MODULE_NAME,
  buildIotWorkloadItems,
  calculateIotPointIntegrationTotals,
  hasIotPointIntegrationItems,
  isIotWorkloadItem
};
