from models.finance import PaymentCategory, PurchaseCategory, ReceiptCategory

class DashboardService:
    def det_category_name(category_id,table_name):
        if table_name == 'payments':
            return PaymentCategory.query.filter_by(id=category_id).first().name
        elif table_name == 'purchases':
            return PurchaseCategory.query.filter_by(id=category_id).first().name
        elif table_name == 'receipts':
            return ReceiptCategory.query.filter_by(id=category_id).first().name
        else:
            return 'Unknown'

