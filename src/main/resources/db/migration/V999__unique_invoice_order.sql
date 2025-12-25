-- Ensure at most one invoice per order
ALTER TABLE invoices
    ADD CONSTRAINT uq_invoice_order UNIQUE (order_id);
