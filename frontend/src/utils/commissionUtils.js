export const getSellerCommission = (seller, globalCommission, checkDateString) => {
  if (!seller || !seller.customCommission) return globalCommission;

  const checkDate = new Date(checkDateString || new Date());
  checkDate.setHours(0, 0, 0, 0);

  if (seller.commissionStartDate) {
    const start = new Date(seller.commissionStartDate);
    start.setHours(0, 0, 0, 0);
    if (checkDate < start) return globalCommission;
  }

  if (seller.commissionEndDate) {
    const end = new Date(seller.commissionEndDate);
    end.setHours(23, 59, 59, 999); // End of the day
    if (checkDate > end) return globalCommission;
  }

  return seller.commissionPercent;
};
