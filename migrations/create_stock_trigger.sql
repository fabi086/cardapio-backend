-- Trigger e Função para Controle de Estoque Automático

CREATE OR REPLACE FUNCTION check_and_deduct_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_track_stock BOOLEAN;
    v_stock_quantity INTEGER;
    v_product_name TEXT;
    v_order_number INTEGER;
BEGIN
    -- Check product stock settings
    SELECT track_stock, stock_quantity, name 
    INTO v_track_stock, v_stock_quantity, v_product_name
    FROM products 
    WHERE id = NEW.product_id;

    IF v_track_stock THEN
        IF v_stock_quantity < NEW.quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto: % (Disponível: %, Solicitado: %)', v_product_name, v_stock_quantity, NEW.quantity;
        END IF;

        -- Deduct stock
        UPDATE products 
        SET stock_quantity = stock_quantity - NEW.quantity 
        WHERE id = NEW.product_id;

        -- Get order number for log
        SELECT order_number INTO v_order_number FROM orders WHERE id = NEW.order_id;

        -- Log movement
        INSERT INTO stock_movements (product_id, order_id, type, quantity, previous_stock, new_stock, reason)
        VALUES (
            NEW.product_id, 
            NEW.order_id, 
            'order', 
            NEW.quantity, 
            v_stock_quantity, 
            v_stock_quantity - NEW.quantity, 
            'Pedido #' || COALESCE(v_order_number::text, '?')
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_stock_order_items ON order_items;
CREATE TRIGGER trg_check_stock_order_items
BEFORE INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION check_and_deduct_stock();
