import { create } from 'zustand';

export type CementCustomerSegment = 'retail' | 'dealer' | 'distributor' | 'project';
export type CementOrderStatus = 'pending' | 'loading' | 'shipping' | 'completed' | 'cancelled';
export type DispatchStatus = 'draft' | 'approved' | 'loading' | 'completed';
export type WeighingStatus = 'pending' | 'matched' | 'deviation';
export type TripStatus = 'scheduled' | 'in_yard' | 'on_route' | 'delivered';
export type ReceivableStatus = 'current' | 'warning' | 'overdue' | 'settled';
export type AuditSeverity = 'info' | 'warning' | 'success';

export interface CementCustomer {
  id: string;
  name: string;
  type: 'individual' | 'business';
  segment: CementCustomerSegment;
  region: string;
  source: 'zalo' | 'facebook' | 'manual';
  phone: string;
  creditLimit: number;
  outstandingDebt: number;
  pricePolicy: string;
  lastInteraction: string;
}

export interface CementProduct {
  id: string;
  name: string;
  cementType: string;
  unit: 'tan';
  standardPrice: number;
}

export interface CementQuote {
  id: string;
  code: string;
  customerId: string;
  createdAt: string;
  totalAmount: number;
  discountAmount: number;
  status: 'draft' | 'approved' | 'converted';
}

export interface CementOrderLine {
  productId: string;
  productName: string;
  cementType: string;
  quantityTons: number;
  unitPrice: number;
}

export interface CementOrder {
  id: string;
  code: string;
  quoteId: string;
  customerId: string;
  channelSource: 'zalo' | 'facebook' | 'manual';
  salesRep: string;
  status: CementOrderStatus;
  createdAt: string;
  deliveryDate: string;
  discountAmount: number;
  promotionAmount: number;
  paymentTermDays: number;
  lines: CementOrderLine[];
}

export interface CementWarehouse {
  id: string;
  name: string;
  location: string;
  manager: string;
  minStockTons: number;
}

export interface CementInventory {
  id: string;
  warehouseId: string;
  productId: string;
  productName: string;
  cementType: string;
  quantityTons: number;
  reservedTons: number;
}

export interface CementDispatchNote {
  id: string;
  code: string;
  orderId: string;
  customerId: string;
  productName: string;
  cementType: string;
  quantityTons: number;
  warehouseId: string;
  truckPlate: string;
  driverName: string;
  createdBy: string;
  approvedBy: string;
  createdAt: string;
  status: DispatchStatus;
}

export interface CementWeighingTicket {
  id: string;
  orderId: string;
  truckPlate: string;
  firstWeightKg: number;
  secondWeightKg: number | null;
  expectedNetKg: number;
  actualNetKg: number | null;
  deviationKg: number | null;
  weighedAt: string;
  status: WeighingStatus;
}

export interface CementTrip {
  id: string;
  orderId: string;
  carrier: string;
  truckPlate: string;
  driverName: string;
  routeName: string;
  status: TripStatus;
  freightCost: number;
  eta: string;
  gateCheckpoint: 'arrived' | 'weighing' | 'loading' | 'gate_out' | 'delivered';
}

export interface CementReceivable {
  id: string;
  customerId: string;
  orderId: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: ReceivableStatus;
}

export interface CementAuditLog {
  id: string;
  createdAt: string;
  severity: AuditSeverity;
  actor: string;
  message: string;
}

export interface CreateQuickOrderInput {
  customerId: string;
  productId: string;
  quantityTons: number;
  unitPrice: number;
  salesRep: string;
  deliveryDate: string;
  source: 'zalo' | 'facebook' | 'manual';
}

type CementSnapshot = {
  customers: CementCustomer[];
  products: CementProduct[];
  quotes: CementQuote[];
  orders: CementOrder[];
  warehouses: CementWarehouse[];
  inventory: CementInventory[];
  dispatchNotes: CementDispatchNote[];
  weighingTickets: CementWeighingTicket[];
  trips: CementTrip[];
  receivables: CementReceivable[];
  auditLogs: CementAuditLog[];
};

interface CementState extends CementSnapshot {
  createQuickOrder: (input: CreateQuickOrderInput) => void;
  advanceOrderStatus: (orderId: string) => void;
  createDispatchNote: (orderId: string) => void;
  reconcileWeighing: (ticketId: string, actualNetKg?: number) => void;
  markTripDelivered: (tripId: string) => void;
  recordPayment: (receivableId: string, amount?: number) => void;
  resetDemoData: () => void;
}

const STORAGE_KEY = 'erp_cement_sales_v1';

const today = new Date();
const isoDay = (offset = 0) => new Date(today.getTime() + offset * 86400000).toISOString();
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const demoSnapshot: CementSnapshot = {
  customers: [
    {
      id: 'cust-01',
      name: 'Dai ly Song Gianh Bac Ninh',
      type: 'business',
      segment: 'distributor',
      region: 'Bac Ninh',
      source: 'zalo',
      phone: '0988123456',
      creditLimit: 250000000,
      outstandingDebt: 126000000,
      pricePolicy: 'NPP mien Bac - CK 2.5%',
      lastInteraction: isoDay(-1),
    },
    {
      id: 'cust-02',
      name: 'Cong ty Xay dung Minh Quan',
      type: 'business',
      segment: 'project',
      region: 'Ha Noi',
      source: 'facebook',
      phone: '0912345678',
      creditLimit: 420000000,
      outstandingDebt: 220000000,
      pricePolicy: 'Du an - cong no 30 ngay',
      lastInteraction: isoDay(0),
    },
    {
      id: 'cust-03',
      name: 'Cua hang VLXD Hung Thinh',
      type: 'business',
      segment: 'dealer',
      region: 'Hai Duong',
      source: 'manual',
      phone: '0977888999',
      creditLimit: 180000000,
      outstandingDebt: 40000000,
      pricePolicy: 'Dai ly cap 2 - tra truoc 50%',
      lastInteraction: isoDay(-2),
    },
  ],
  products: [
    { id: 'prd-01', name: 'Xi mang PCB40 Tien Son', cementType: 'PCB40', unit: 'tan', standardPrice: 1370000 },
    { id: 'prd-02', name: 'Xi mang PCB30 Tien Son', cementType: 'PCB30', unit: 'tan', standardPrice: 1295000 },
    { id: 'prd-03', name: 'Xi mang roi MC25', cementType: 'MC25', unit: 'tan', standardPrice: 1180000 },
  ],
  quotes: [
    { id: 'quo-01', code: 'BG-240626-001', customerId: 'cust-01', createdAt: isoDay(-2), totalAmount: 123300000, discountAmount: 3200000, status: 'converted' },
    { id: 'quo-02', code: 'BG-240626-002', customerId: 'cust-02', createdAt: isoDay(-1), totalAmount: 168000000, discountAmount: 0, status: 'approved' },
    { id: 'quo-03', code: 'BG-240626-003', customerId: 'cust-03', createdAt: isoDay(0), totalAmount: 70800000, discountAmount: 1200000, status: 'draft' },
  ],
  orders: [
    {
      id: 'ord-01',
      code: 'DH-240626-001',
      quoteId: 'quo-01',
      customerId: 'cust-01',
      channelSource: 'zalo',
      salesRep: 'Tran Huyen',
      status: 'shipping',
      createdAt: isoDay(-2),
      deliveryDate: isoDay(1),
      discountAmount: 3200000,
      promotionAmount: 0,
      paymentTermDays: 15,
      lines: [{ productId: 'prd-01', productName: 'Xi mang PCB40 Tien Son', cementType: 'PCB40', quantityTons: 90, unitPrice: 1370000 }],
    },
    {
      id: 'ord-02',
      code: 'DH-240626-002',
      quoteId: 'quo-02',
      customerId: 'cust-02',
      channelSource: 'facebook',
      salesRep: 'Le Thuy',
      status: 'loading',
      createdAt: isoDay(-1),
      deliveryDate: isoDay(1),
      discountAmount: 0,
      promotionAmount: 2500000,
      paymentTermDays: 30,
      lines: [{ productId: 'prd-03', productName: 'Xi mang roi MC25', cementType: 'MC25', quantityTons: 140, unitPrice: 1180000 }],
    },
    {
      id: 'ord-03',
      code: 'DH-240626-003',
      quoteId: 'quo-03',
      customerId: 'cust-03',
      channelSource: 'manual',
      salesRep: 'Nguyen Manh',
      status: 'pending',
      createdAt: isoDay(0),
      deliveryDate: isoDay(2),
      discountAmount: 1200000,
      promotionAmount: 0,
      paymentTermDays: 7,
      lines: [{ productId: 'prd-02', productName: 'Xi mang PCB30 Tien Son', cementType: 'PCB30', quantityTons: 55, unitPrice: 1295000 }],
    },
  ],
  warehouses: [
    { id: 'wh-01', name: 'Kho Tong Tien Son', location: 'Bac Ninh', manager: 'Pham Kien', minStockTons: 180 },
    { id: 'wh-02', name: 'Kho Trung Chuyen Gia Lam', location: 'Ha Noi', manager: 'Vu Ngan', minStockTons: 120 },
  ],
  inventory: [
    { id: 'inv-01', warehouseId: 'wh-01', productId: 'prd-01', productName: 'Xi mang PCB40 Tien Son', cementType: 'PCB40', quantityTons: 420, reservedTons: 90 },
    { id: 'inv-02', warehouseId: 'wh-01', productId: 'prd-02', productName: 'Xi mang PCB30 Tien Son', cementType: 'PCB30', quantityTons: 280, reservedTons: 55 },
    { id: 'inv-03', warehouseId: 'wh-02', productId: 'prd-03', productName: 'Xi mang roi MC25', cementType: 'MC25', quantityTons: 190, reservedTons: 140 },
  ],
  dispatchNotes: [
    { id: 'dn-01', code: 'PXK-240626-001', orderId: 'ord-01', customerId: 'cust-01', productName: 'Xi mang PCB40 Tien Son', cementType: 'PCB40', quantityTons: 90, warehouseId: 'wh-01', truckPlate: '99C-168.68', driverName: 'Bui Quoc Tuan', createdBy: 'Tran Huyen', approvedBy: 'Giam doc ban hang', createdAt: isoDay(-1), status: 'loading' },
    { id: 'dn-02', code: 'PXK-240626-002', orderId: 'ord-02', customerId: 'cust-02', productName: 'Xi mang roi MC25', cementType: 'MC25', quantityTons: 140, warehouseId: 'wh-02', truckPlate: '29H-556.79', driverName: 'Nguyen Xuan Hiep', createdBy: 'Le Thuy', approvedBy: 'Truong phong dieu van', createdAt: isoDay(0), status: 'approved' },
  ],
  weighingTickets: [
    { id: 'wt-01', orderId: 'ord-01', truckPlate: '99C-168.68', firstWeightKg: 12480, secondWeightKg: 102480, expectedNetKg: 90000, actualNetKg: 90000, deviationKg: 0, weighedAt: isoDay(0), status: 'matched' },
    { id: 'wt-02', orderId: 'ord-02', truckPlate: '29H-556.79', firstWeightKg: 13620, secondWeightKg: null, expectedNetKg: 140000, actualNetKg: null, deviationKg: null, weighedAt: isoDay(0), status: 'pending' },
  ],
  trips: [
    { id: 'trip-01', orderId: 'ord-01', carrier: 'Tien Son Logistics', truckPlate: '99C-168.68', driverName: 'Bui Quoc Tuan', routeName: 'Kho Tong -> Dai ly Song Gianh', status: 'on_route', freightCost: 7200000, eta: isoDay(1), gateCheckpoint: 'gate_out' },
    { id: 'trip-02', orderId: 'ord-02', carrier: 'Minh Phat Transport', truckPlate: '29H-556.79', driverName: 'Nguyen Xuan Hiep', routeName: 'Gia Lam -> Cong truong Minh Quan', status: 'in_yard', freightCost: 9800000, eta: isoDay(1), gateCheckpoint: 'weighing' },
  ],
  receivables: [
    { id: 'rcv-01', customerId: 'cust-01', orderId: 'ord-01', dueDate: isoDay(12), amount: 120100000, paidAmount: 40000000, status: 'warning' },
    { id: 'rcv-02', customerId: 'cust-02', orderId: 'ord-02', dueDate: isoDay(-3), amount: 162700000, paidAmount: 20000000, status: 'overdue' },
    { id: 'rcv-03', customerId: 'cust-03', orderId: 'ord-03', dueDate: isoDay(7), amount: 70025000, paidAmount: 35000000, status: 'current' },
  ],
  auditLogs: [
    { id: 'log-01', createdAt: isoDay(0), severity: 'warning', actor: 'Workflow', message: 'Don DH-240626-002 da den cong doan can lan 1, cho xuat hang.' },
    { id: 'log-02', createdAt: isoDay(0), severity: 'success', actor: 'AI Assistant', message: 'Da goi y bao gia PCB40 cho dai ly Song Gianh tu hoi thoai Zalo.' },
    { id: 'log-03', createdAt: isoDay(-1), severity: 'info', actor: 'ERP', message: 'Cong no Cong ty Minh Quan qua han 3 ngay, da tao nhac thu no.' },
  ],
};

function cloneSnapshot(snapshot: CementSnapshot): CementSnapshot {
  return JSON.parse(JSON.stringify(snapshot));
}

function loadSnapshot(): CementSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...cloneSnapshot(demoSnapshot), ...JSON.parse(raw) };
  } catch {}
  return cloneSnapshot(demoSnapshot);
}

function persistSnapshot(snapshot: CementSnapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {}
}

function nextOrderStatus(status: CementOrderStatus): CementOrderStatus {
  if (status === 'pending') return 'loading';
  if (status === 'loading') return 'shipping';
  if (status === 'shipping') return 'completed';
  return status;
}

function computeOrderAmount(order: CementOrder) {
  const gross = order.lines.reduce((sum, line) => sum + line.quantityTons * line.unitPrice, 0);
  return gross - order.discountAmount - order.promotionAmount;
}

function buildSnapshotPatch(state: CementState, patch: Partial<CementSnapshot>): CementSnapshot {
  return {
    customers: patch.customers ?? state.customers,
    products: patch.products ?? state.products,
    quotes: patch.quotes ?? state.quotes,
    orders: patch.orders ?? state.orders,
    warehouses: patch.warehouses ?? state.warehouses,
    inventory: patch.inventory ?? state.inventory,
    dispatchNotes: patch.dispatchNotes ?? state.dispatchNotes,
    weighingTickets: patch.weighingTickets ?? state.weighingTickets,
    trips: patch.trips ?? state.trips,
    receivables: patch.receivables ?? state.receivables,
    auditLogs: patch.auditLogs ?? state.auditLogs,
  };
}

export const useErpCementStore = create<CementState>((set, get) => ({
  ...loadSnapshot(),

  createQuickOrder: (input) => set((state) => {
    const product = state.products.find((item) => item.id === input.productId);
    const customer = state.customers.find((item) => item.id === input.customerId);
    if (!product || !customer) return {};

    const quoteId = uid('quo');
    const orderId = uid('ord');
    const totalAmount = input.quantityTons * input.unitPrice;
    const quoteCode = `BG-${Date.now().toString().slice(-6)}`;
    const orderCode = `DH-${Date.now().toString().slice(-6)}`;

    const nextQuote: CementQuote = {
      id: quoteId,
      code: quoteCode,
      customerId: customer.id,
      createdAt: new Date().toISOString(),
      totalAmount,
      discountAmount: 0,
      status: 'converted',
    };

    const nextOrder: CementOrder = {
      id: orderId,
      code: orderCode,
      quoteId,
      customerId: customer.id,
      channelSource: input.source,
      salesRep: input.salesRep,
      status: 'pending',
      createdAt: new Date().toISOString(),
      deliveryDate: input.deliveryDate,
      discountAmount: 0,
      promotionAmount: 0,
      paymentTermDays: 14,
      lines: [{
        productId: product.id,
        productName: product.name,
        cementType: product.cementType,
        quantityTons: input.quantityTons,
        unitPrice: input.unitPrice,
      }],
    };

    const nextReceivable: CementReceivable = {
      id: uid('rcv'),
      customerId: customer.id,
      orderId,
      dueDate: new Date(new Date(input.deliveryDate).getTime() + 14 * 86400000).toISOString(),
      amount: totalAmount,
      paidAmount: 0,
      status: 'current',
    };

    const snapshot = buildSnapshotPatch(state, {
      quotes: [nextQuote, ...state.quotes],
      orders: [nextOrder, ...state.orders],
      receivables: [nextReceivable, ...state.receivables],
      auditLogs: [
        {
          id: uid('log'),
          createdAt: new Date().toISOString(),
          severity: 'success',
          actor: 'CRM -> ERP',
          message: `Da chuyen hoi thoai ${input.source.toUpperCase()} thanh bao gia ${quoteCode} va don ${orderCode}.`,
        },
        ...state.auditLogs,
      ],
    });
    persistSnapshot(snapshot);
    return snapshot;
  }),

  advanceOrderStatus: (orderId) => set((state) => {
    const order = state.orders.find((item) => item.id === orderId);
    if (!order || order.status === 'completed' || order.status === 'cancelled') return {};

    const targetStatus = nextOrderStatus(order.status);
    const orders = state.orders.map((item) => item.id === orderId ? { ...item, status: targetStatus } : item);
    let dispatchNotes = state.dispatchNotes;
    let trips = state.trips;
    let weighingTickets = state.weighingTickets;

    if (order.status === 'pending' && !dispatchNotes.some((item) => item.orderId === orderId)) {
      const line = order.lines[0];
      const dispatch: CementDispatchNote = {
        id: uid('dn'),
        code: `PXK-${Date.now().toString().slice(-6)}`,
        orderId,
        customerId: order.customerId,
        productName: line.productName,
        cementType: line.cementType,
        quantityTons: line.quantityTons,
        warehouseId: state.warehouses[0]?.id || 'wh-01',
        truckPlate: '30H-889.66',
        driverName: 'Tai xe dieu phoi',
        createdBy: order.salesRep,
        approvedBy: 'Truong ca kho',
        createdAt: new Date().toISOString(),
        status: 'approved',
      };
      const weighing: CementWeighingTicket = {
        id: uid('wt'),
        orderId,
        truckPlate: dispatch.truckPlate,
        firstWeightKg: 13800,
        secondWeightKg: null,
        expectedNetKg: line.quantityTons * 1000,
        actualNetKg: null,
        deviationKg: null,
        weighedAt: new Date().toISOString(),
        status: 'pending',
      };
      const trip: CementTrip = {
        id: uid('trip'),
        orderId,
        carrier: 'Dieu van noi bo',
        truckPlate: dispatch.truckPlate,
        driverName: dispatch.driverName,
        routeName: 'Kho Tong -> Diem giao hang',
        status: 'scheduled',
        freightCost: 6500000,
        eta: order.deliveryDate,
        gateCheckpoint: 'arrived',
      };
      dispatchNotes = [dispatch, ...dispatchNotes];
      weighingTickets = [weighing, ...weighingTickets];
      trips = [trip, ...trips];
    }

    if (targetStatus === 'shipping') {
      dispatchNotes = dispatchNotes.map((item) => item.orderId === orderId ? { ...item, status: 'loading' } : item);
      trips = trips.map((item) => item.orderId === orderId ? { ...item, status: 'on_route', gateCheckpoint: 'gate_out' } : item);
    }
    if (targetStatus === 'completed') {
      dispatchNotes = dispatchNotes.map((item) => item.orderId === orderId ? { ...item, status: 'completed' } : item);
      trips = trips.map((item) => item.orderId === orderId ? { ...item, status: 'delivered', gateCheckpoint: 'delivered' } : item);
    }

    const snapshot = buildSnapshotPatch(state, {
      orders,
      dispatchNotes,
      trips,
      weighingTickets,
      auditLogs: [
        {
          id: uid('log'),
          createdAt: new Date().toISOString(),
          severity: targetStatus === 'completed' ? 'success' : 'info',
          actor: 'Workflow',
          message: `Don ${order.code} chuyen sang trang thai ${targetStatus}.`,
        },
        ...state.auditLogs,
      ],
    });
    persistSnapshot(snapshot);
    return snapshot;
  }),

  createDispatchNote: (orderId) => set((state) => {
    if (state.dispatchNotes.some((item) => item.orderId === orderId)) return {};
    const order = state.orders.find((item) => item.id === orderId);
    if (!order) return {};
    const line = order.lines[0];
    const dispatch: CementDispatchNote = {
      id: uid('dn'),
      code: `PXK-${Date.now().toString().slice(-6)}`,
      orderId,
      customerId: order.customerId,
      productName: line.productName,
      cementType: line.cementType,
      quantityTons: line.quantityTons,
      warehouseId: state.warehouses[0]?.id || 'wh-01',
      truckPlate: '88C-456.78',
      driverName: 'Tai xe tu dong',
      createdBy: order.salesRep,
      approvedBy: 'Quan ly kho',
      createdAt: new Date().toISOString(),
      status: 'draft',
    };
    const snapshot = buildSnapshotPatch(state, {
      dispatchNotes: [dispatch, ...state.dispatchNotes],
      auditLogs: [
        {
          id: uid('log'),
          createdAt: new Date().toISOString(),
          severity: 'info',
          actor: 'ERP',
          message: `Da tao phieu xuat kho ${dispatch.code} cho ${order.code}.`,
        },
        ...state.auditLogs,
      ],
    });
    persistSnapshot(snapshot);
    return snapshot;
  }),

  reconcileWeighing: (ticketId, actualNetKg) => set((state) => {
    const ticket = state.weighingTickets.find((item) => item.id === ticketId);
    if (!ticket) return {};
    const actual = actualNetKg ?? ticket.expectedNetKg - 180;
    const deviation = actual - ticket.expectedNetKg;
    const updatedTicket: CementWeighingTicket = {
      ...ticket,
      secondWeightKg: ticket.firstWeightKg + actual,
      actualNetKg: actual,
      deviationKg: deviation,
      status: Math.abs(deviation) > 300 ? 'deviation' : 'matched',
    };
    const snapshot = buildSnapshotPatch(state, {
      weighingTickets: state.weighingTickets.map((item) => item.id === ticketId ? updatedTicket : item),
      auditLogs: [
        {
          id: uid('log'),
          createdAt: new Date().toISOString(),
          severity: updatedTicket.status === 'deviation' ? 'warning' : 'success',
          actor: 'Can xe',
          message: `Phieu can ${ticket.truckPlate} da doi chieu xong, sai lech ${deviation} kg.`,
        },
        ...state.auditLogs,
      ],
    });
    persistSnapshot(snapshot);
    return snapshot;
  }),

  markTripDelivered: (tripId) => set((state) => {
    const trip = state.trips.find((item) => item.id === tripId);
    if (!trip) return {};
    const orders = state.orders.map((item) => item.id === trip.orderId ? { ...item, status: 'completed' } : item);
    const trips = state.trips.map((item) => item.id === tripId ? { ...item, status: 'delivered', gateCheckpoint: 'delivered' } : item);
    const dispatchNotes = state.dispatchNotes.map((item) => item.orderId === trip.orderId ? { ...item, status: 'completed' } : item);
    const snapshot = buildSnapshotPatch(state, {
      orders,
      trips,
      dispatchNotes,
      auditLogs: [
        {
          id: uid('log'),
          createdAt: new Date().toISOString(),
          severity: 'success',
          actor: 'Giao nhan',
          message: `Xe ${trip.truckPlate} da giao hang xong, cap nhat bien ban giao nhan dien tu.`,
        },
        ...state.auditLogs,
      ],
    });
    persistSnapshot(snapshot);
    return snapshot;
  }),

  recordPayment: (receivableId, amount) => set((state) => {
    const receivable = state.receivables.find((item) => item.id === receivableId);
    if (!receivable) return {};
    const remaining = receivable.amount - receivable.paidAmount;
    const payment = amount ?? remaining;
    const paidAmount = Math.min(receivable.amount, receivable.paidAmount + payment);
    const status: ReceivableStatus = paidAmount >= receivable.amount ? 'settled' : paidAmount / receivable.amount >= 0.5 ? 'warning' : receivable.status;
    const receivables = state.receivables.map((item) => item.id === receivableId ? { ...item, paidAmount, status } : item);
    const customers = state.customers.map((item) => item.id === receivable.customerId ? { ...item, outstandingDebt: Math.max(0, item.outstandingDebt - payment) } : item);
    const snapshot = buildSnapshotPatch(state, {
      receivables,
      customers,
      auditLogs: [
        {
          id: uid('log'),
          createdAt: new Date().toISOString(),
          severity: paidAmount >= receivable.amount ? 'success' : 'info',
          actor: 'Cong no',
          message: `Da ghi nhan thanh toan ${payment.toLocaleString('vi-VN')} VND cho don ${receivable.orderId}.`,
        },
        ...state.auditLogs,
      ],
    });
    persistSnapshot(snapshot);
    return snapshot;
  }),

  resetDemoData: () => {
    const snapshot = cloneSnapshot(demoSnapshot);
    persistSnapshot(snapshot);
    set(snapshot);
  },
}));

export function getOrderAmount(order: CementOrder) {
  return computeOrderAmount(order);
}