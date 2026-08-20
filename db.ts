import { supabase } from './supabaseClient';

// --- BILLS ---

export const generateBillNo = async () => {
  // Check both bills and exchanges to find the absolute latest number
  const [{ data: bills }, { data: exchanges }] = await Promise.all([
    supabase.from('bills').select('bill_no').order('created_at', { ascending: false }).limit(20),
    supabase.from('gold_exchanges').select('reference_no').order('created_at', { ascending: false }).limit(20)
  ]);

  let maxNum = 0;

  const extractNumber = (str: string) => {
    if (!str) return;
    const match = str.match(/MJ-(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  };

  bills?.forEach(b => extractNumber(b.bill_no));
  exchanges?.forEach(e => extractNumber(e.reference_no));

  const nextNum = maxNum + 1;
  // Pad to 4 digits (0001), but allow it to grow naturally (10000+)
  const padded = nextNum.toString().padStart(Math.max(4, nextNum.toString().length), '0');
  return `MJ-${padded}`;
};

export const restoreInventoryStock = async (billItems: any[]) => {
  for (const billItem of billItems) {
    if (!billItem.barcode && !billItem.item_name) continue;

    // 1. Check if item currently exists in items table by ID or barcode
    let existingItem: any = null;

    if (billItem.inventory_item_id) {
      const targetId = (typeof billItem.inventory_item_id === 'string' && !isNaN(Number(billItem.inventory_item_id)))
        ? Number(billItem.inventory_item_id)
        : billItem.inventory_item_id;

      const { data: byId } = await supabase
        .from('items')
        .select('*')
        .eq('id', targetId)
        .limit(1);

      if (byId && byId.length > 0) {
        existingItem = byId[0];
      }
    }

    if (!existingItem && billItem.barcode) {
      const { data: matchedItems } = await supabase
        .from('items')
        .select('*')
        .eq('barcode', billItem.barcode);

      if (matchedItems && matchedItems.length > 0) {
        existingItem = matchedItems[0];
      }
    }

    if (existingItem) {
      // Item exists in inventory: increment quantity and set stock_status in_stock
      const currentQty = Number(existingItem.quantity || 0);
      await supabase
        .from('items')
        .update({
          quantity: currentQty + 1,
          stock_status: 'in_stock'
        })
        .eq('id', existingItem.id);
    } else {
      // Item was deleted from inventory when sold: re-create the product record back into items table!
      let category = billItem.category || '';
      let cleanName = billItem.item_name || '';

      if (!category && cleanName.includes('[') && cleanName.includes(']')) {
        const match = cleanName.match(/^(.*?)\s*\[(.*?)\]$/);
        if (match) {
          cleanName = match[1].trim();
          category = match[2].trim();
        }
      }

      const wt = Number(billItem.net_weight || billItem.weight || billItem.gross_weight || 0);

      await supabase.from('items').insert({
        barcode: billItem.barcode || `MJ-RESTORED-${Date.now().toString().slice(-4)}`,
        item_name: cleanName || 'Restored Item',
        category: category || 'General',
        gross_weight: billItem.gross_weight || wt,
        net_weight: billItem.net_weight || wt,
        weight: wt,
        metal_type: billItem.metal_type || 'Gold',
        purity: billItem.purity || '22K',
        hsn_code: billItem.hsn_code || '711319',
        making_charges: billItem.making_charges || 0,
        quantity: 1,
        stock_status: 'in_stock'
      });
    }
  }
};

export const deleteBill = async (id: number) => {
  // 1. Fetch bill items before deleting the bill
  const { data: billItems } = await supabase
    .from('bill_items')
    .select('*')
    .eq('bill_id', id);

  // 2. Restore sold products back into inventory
  if (billItems && billItems.length > 0) {
    await restoreInventoryStock(billItems);
  }

  // 3. Delete bill items and bill record
  const { error: itemsError } = await supabase
    .from('bill_items')
    .delete()
    .eq('bill_id', id);
  
  if (itemsError) throw itemsError;

  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const getCustomerHistory = async (customerId: number) => {
  const { data, error } = await supabase
    .from('bills')
    .select('*, bill_items(*)')
    .eq('customer_id', customerId)
    .order('bill_date', { ascending: false });

  if (error) throw error;
  return data;
};

export const getCustomerBookings = async (customerId: number) => {
  const { data, error } = await supabase
    .from('advance_bookings')
    .select('*, bills(*)')
    .eq('bills.customer_id', customerId)
    .order('booking_date', { ascending: false });

  if (error) throw error;
  return data;
};

export const getCustomerLayaways = async (customerId: number) => {
  const { data, error } = await supabase
    .from('layaway_transactions')
    .select('*, bills(*)')
    .eq('bills.customer_id', customerId)
    .order('payment_date', { ascending: false });

  if (error) throw error;
  return data;
};

export const createBill = async (billData: any) => {
  const { data, error } = await supabase
    .from('bills')
    .insert(billData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateBill = async (id: number, billData: any) => {
  const { data, error } = await supabase
    .from('bills')
    .update(billData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getBillById = async (id: number) => {
  const { data, error } = await supabase
    .from('bills')
    .select('*, customers(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

// --- BILL ITEMS ---

export const createBillItems = async (billId: number, items: any[]) => {
  const itemsWithBillId = items.map(item => ({ ...item, bill_id: billId }));
  
  const { data, error } = await supabase
    .from('bill_items')
    .insert(itemsWithBillId)
    .select();

  if (error) throw error;
  return data;
};

export const getBillItems = async (billId: number) => {
  const { data, error } = await supabase
    .from('bill_items')
    .select('*')
    .eq('bill_id', billId)
    .order('sl_no', { ascending: true });

  if (error) throw error;
  return data;
};

// --- CUSTOMERS ---

export const searchCustomers = async (searchTerm: string) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .or(`phone.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
    .limit(10);

  if (error) throw error;
  return data;
};

export const getCustomers = async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
};

export const createCustomer = async (customerData: any) => {
  const { data, error } = await supabase
    .from('customers')
    .insert(customerData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateCustomer = async (id: number, customerData: any) => {
  const { data, error } = await supabase
    .from('customers')
    .update(customerData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCustomer = async (id: number) => {
  // First disassociate any bills linked to this customer (set customer_id = null)
  // to avoid foreign key constraint violations (bills_customer_id_fkey) while keeping sales history
  const { error: unlinkError } = await supabase
    .from('bills')
    .update({ customer_id: null })
    .eq('customer_id', id);

  if (unlinkError) {
    console.error('Error unlinking bills for customer:', unlinkError);
  }

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// --- ITEMS (INVENTORY) ---

export const getInventoryItems = async () => {
  let allItems: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  // Loop page-by-page to bypass Supabase PostgREST 1,000 max_rows per-request limit
  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    if (data && data.length > 0) {
      allItems = [...allItems, ...data];
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  return allItems;
};

export const createInventoryItem = async (itemData: any) => {
  const { id: _id, created_at: _created_at, ...cleanData } = itemData;

  const { data, error } = await supabase
    .from('items')
    .insert(cleanData)
    .select();

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
};

export const updateInventoryItem = async (id: string | number, itemData: any) => {
  const { id: _id, created_at: _created_at, ...cleanData } = itemData;
  const targetId = (typeof id === 'string' && !isNaN(Number(id))) ? Number(id) : id;

  const { data, error } = await supabase
    .from('items')
    .update(cleanData)
    .eq('id', targetId)
    .select();

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
};

export const deleteInventoryItem = async (id: string | number) => {
  const targetId = (typeof id === 'string' && !isNaN(Number(id))) ? Number(id) : id;

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', targetId);

  if (error) throw error;
};

export const getItemByBarcode = async (barcode: string) => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('barcode', barcode)
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
};

export const deductInventoryStock = async (billItems: any[]) => {
  for (const billItem of billItems) {
    if (!billItem.barcode && !billItem.inventory_item_id) continue;
    
    let targetItem: any = null;

    // 1. Priority 1: Match by exact inventory primary key ID
    if (billItem.inventory_item_id) {
      const targetId = (typeof billItem.inventory_item_id === 'string' && !isNaN(Number(billItem.inventory_item_id))) 
        ? Number(billItem.inventory_item_id) 
        : billItem.inventory_item_id;

      const { data: byId } = await supabase
        .from('items')
        .select('*')
        .eq('id', targetId)
        .limit(1);

      if (byId && byId.length > 0) {
        targetItem = byId[0];
      }
    }

    // 2. Priority 2: Match by barcode + category + weight for duplicate barcodes
    if (!targetItem && billItem.barcode) {
      const { data: matchedItems } = await supabase
        .from('items')
        .select('*')
        .eq('barcode', billItem.barcode)
        .order('created_at', { ascending: false });

      if (matchedItems && matchedItems.length > 0) {
        targetItem = matchedItems.find(i => {
          const matchCategory = billItem.category && i.category && i.category.toLowerCase().trim() === billItem.category.toLowerCase().trim();
          const matchWeight = (billItem.net_weight || billItem.weight) && 
            (Math.abs((i.net_weight || i.weight || 0) - (billItem.net_weight || billItem.weight || 0)) < 0.005);
          return matchCategory || matchWeight;
        }) || matchedItems[0];
      }
    }

    if (!targetItem) continue;

    const soldQty = 1;
    const currentQty = targetItem.quantity !== undefined && targetItem.quantity !== null ? Number(targetItem.quantity) : 1;
    const newQty = Math.max(0, currentQty - soldQty);

    if (newQty <= 0) {
      // Delete sold product from inventory table after sale
      await supabase
        .from('items')
        .delete()
        .eq('id', targetItem.id);
    } else {
      // Reduce quantity if item had multiple pcs stored
      await supabase
        .from('items')
        .update({ 
          quantity: newQty, 
          stock_status: 'in_stock' 
        })
        .eq('id', targetItem.id);
    }
  }
};

// --- GOLD RATES ---

export const getDailyRates = async (date: string) => {
  const { data, error } = await supabase
    .from('gold_rates')
    .select('*')
    .eq('effective_date', date);

  if (error) throw error;
  return data;
};

// --- LAYAWAY TRANSACTIONS ---

export const getLayawayTransactions = async (billId?: number) => {
  let query = supabase
    .from('layaway_transactions')
    .select('*')
    .order('payment_date', { ascending: false });

  if (billId) {
    query = query.eq('bill_id', billId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as any[];
};

export const getLayawayTransactionById = async (id: number) => {
  const { data, error } = await supabase
    .from('layaway_transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createLayawayTransaction = async (transaction: any) => {
  const { data, error } = await supabase
    .from('layaway_transactions')
    .insert(transaction)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateLayawayTransaction = async (id: number, updates: any) => {
  const { data, error } = await supabase
    .from('layaway_transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteLayawayTransaction = async (id: number) => {
  const { error } = await supabase
    .from('layaway_transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// --- ADVANCE BOOKINGS ---

export const getAdvanceBookings = async () => {
  const { data, error } = await supabase
    .from('advance_bookings')
    .select(`
      *,
      bills (
        *,
        customers (*)
      )
    `)
    .order('booking_date', { ascending: false });

  if (error) throw error;
  return data as any[];
};

export const getAdvanceBookingById = async (id: number) => {
  const { data, error } = await supabase
    .from('advance_bookings')
    .select(`
      *,
      bills (
        *,
        customers (*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createAdvanceBooking = async (booking: any) => {
  const { data, error } = await supabase
    .from('advance_bookings')
    .insert(booking)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateAdvanceBooking = async (id: number, updates: any) => {
  const { data, error } = await supabase
    .from('advance_bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteAdvanceBooking = async (id: number) => {
  const { error } = await supabase
    .from('advance_bookings')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// --- GOLD EXCHANGES ---

export const getExchanges = async () => {
  const { data, error } = await supabase
    .from('gold_exchanges')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createExchange = async (exchangeData: any) => {
  const { data, error } = await supabase
    .from('gold_exchanges')
    .insert(exchangeData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateExchange = async (id: string, exchangeData: any) => {
  const { data, error } = await supabase
    .from('gold_exchanges')
    .update(exchangeData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteExchange = async (id: string) => {
  const { error } = await supabase
    .from('gold_exchanges')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
