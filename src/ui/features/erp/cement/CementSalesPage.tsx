import React, { useMemo, useState } from 'react';
import { getOrderAmount, type CementAuditLog, type CementCustomer, type CementDispatchNote, type CementInventory, type CementOrder, type CementReceivable, type CementTrip, type CementWeighingTicket, useErpCementStore } from '@/store/erp/erpCementStore';
import { useAppStore } from '@/store/appStore';

const currency = (value: number) => `${value.toLocaleString('vi-VN')} VND`;
const tons = (value: number) => `${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tan`;
const shortDate = (value: string) => new Date(value).toLocaleDateString('vi-VN');

function statusClass(status: string) {
  if (status === 'completed' || status === 'delivered' || status === 'matched' || status === 'settled') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (status === 'shipping' || status === 'loading' || status === 'approved' || status === 'warning') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  if (status === 'overdue' || status === 'deviation' || status === 'cancelled') return 'bg-red-500/15 text-red-300 border-red-500/30';
  return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
}

function severityClass(level: CementAuditLog['severity']) {
  if (level === 'success') return 'border-emerald-500/30 bg-emerald-500/10';
  if (level === 'warning') return 'border-amber-500/30 bg-amber-500/10';
  return 'border-slate-600 bg-slate-800/80';
}

function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 shadow-[0_24px_80px_rgba(15,23,42,0.45)] overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-800 bg-slate-950/70">
        <div>
          <h2 className="text-white text-sm font-semibold tracking-wide uppercase">{title}</h2>
          {subtitle ? <p className="text-slate-400 text-xs mt-1">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="text-2xl font-bold text-white mt-3">{value}</div>
      <div className="text-xs text-slate-500 mt-2">{hint}</div>
    </div>
  );
}

export default function CementSalesPage() {
  const {
    customers,
    products,
    orders,
    warehouses,
    inventory,
    dispatchNotes,
    weighingTickets,
    trips,
    receivables,
    auditLogs,
    createQuickOrder,
    advanceOrderStatus,
    createDispatchNote,
    reconcileWeighing,
    markTripDelivered,
    recordPayment,
    resetDemoData,
  } = useErpCementStore();
  const showNotification = useAppStore((state) => state.showNotification);

  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [quantityTons, setQuantityTons] = useState(25);
  const [unitPrice, setUnitPrice] = useState(products[0]?.standardPrice || 0);
  const [salesRep, setSalesRep] = useState('Tran Huyen');
  const [source, setSource] = useState<'zalo' | 'facebook' | 'manual'>('zalo');
  const [deliveryDate, setDeliveryDate] = useState(() => new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10));

  const customerMap = useMemo(() => Object.fromEntries(customers.map((item) => [item.id, item])), [customers]);
  const warehouseMap = useMemo(() => Object.fromEntries(warehouses.map((item) => [item.id, item])), [warehouses]);

  const totals = useMemo(() => {
    const revenue = orders.reduce((sum, order) => sum + getOrderAmount(order), 0);
    const soldTons = orders.reduce((sum, order) => sum + order.lines.reduce((lineSum, line) => lineSum + line.quantityTons, 0), 0);
    const stockTons = inventory.reduce((sum, item) => sum + item.quantityTons, 0);
    const trucksMoving = trips.filter((item) => item.status === 'on_route' || item.status === 'in_yard').length;
    const overdueDebt = receivables.filter((item) => item.status === 'overdue').reduce((sum, item) => sum + (item.amount - item.paidAmount), 0);
    return { revenue, soldTons, stockTons, trucksMoving, overdueDebt };
  }, [orders, inventory, trips, receivables]);

  const alerts = useMemo(() => {
    const stockAlerts = inventory.filter((item) => item.quantityTons - item.reservedTons < (warehouseMap[item.warehouseId]?.minStockTons || 0));
    const overdue = receivables.filter((item) => item.status === 'overdue');
    const pendingWeigh = weighingTickets.filter((item) => item.status === 'pending');
    return { stockAlerts, overdue, pendingWeigh };
  }, [inventory, receivables, weighingTickets, warehouseMap]);

  const pipeline = useMemo(() => {
    const orderCount = (status: CementOrder['status']) => orders.filter((item) => item.status === status).length;
    return [
      { label: 'Khach hang tu kenh chat', count: customers.filter((item) => item.source !== 'manual').length, color: 'bg-sky-500' },
      { label: 'Bao gia / Cho xac nhan', count: orderCount('pending'), color: 'bg-violet-500' },
      { label: 'Dang xuat hang', count: orderCount('loading'), color: 'bg-amber-500' },
      { label: 'Dang van chuyen', count: orderCount('shipping'), color: 'bg-orange-500' },
      { label: 'Hoan thanh / Cham soc sau ban', count: orderCount('completed'), color: 'bg-emerald-500' },
    ];
  }, [customers, orders]);

  const aiSuggestions = useMemo(() => {
    const overdue = receivables.filter((item) => item.status === 'overdue').map((item) => customerMap[item.customerId]?.name).filter(Boolean);
    const stockRisk = alerts.stockAlerts.map((item) => `${item.productName} tai ${warehouseMap[item.warehouseId]?.name}`);
    return [
      `AI de xuat uu tien thu cong no ngay hom nay cho: ${overdue.join(', ') || 'khong co'}.`,
      `AI de xuat dieu chuyen ton kho de tranh dut hang: ${stockRisk.join('; ') || 'muc ton an toan'}.`,
      'AI co the bien hoi thoai Zalo/Facebook thanh bao gia, nhac lich cham soc va tao don nhanh ngay tren man hinh nay.',
    ];
  }, [alerts.stockAlerts, customerMap, receivables, warehouseMap]);

  const handleCreateOrder = () => {
    createQuickOrder({
      customerId,
      productId,
      quantityTons,
      unitPrice,
      salesRep,
      deliveryDate: new Date(deliveryDate).toISOString(),
      source,
    });
    showNotification('Da tao bao gia va don hang nhanh cho phan he xi mang.', 'success');
  };

  const handleExportExcel = async (kind: 'sales' | 'inventory' | 'receivable') => {
    try {
      const XLSX = await import('xlsx');
      let rows: Record<string, unknown>[] = [];
      let fileName = '';
      let sheetName = '';

      if (kind === 'sales') {
        rows = orders.map((order) => ({
          'Ma don': order.code,
          'Khach hang': customerMap[order.customerId]?.name || order.customerId,
          'Nguon': order.channelSource,
          'Nhan vien': order.salesRep,
          'Trang thai': order.status,
          'So tan': order.lines.reduce((sum, line) => sum + line.quantityTons, 0),
          'Doanh thu': getOrderAmount(order),
          'Ngay giao': shortDate(order.deliveryDate),
        }));
        fileName = `BaoCao_BanHang_XiMang_${Date.now()}.xlsx`;
        sheetName = 'BanHang';
      }

      if (kind === 'inventory') {
        rows = inventory.map((item) => ({
          'Kho': warehouseMap[item.warehouseId]?.name || item.warehouseId,
          'San pham': item.productName,
          'Chung loai': item.cementType,
          'Ton hien tai': item.quantityTons,
          'Da giu cho don': item.reservedTons,
          'Ton kha dung': item.quantityTons - item.reservedTons,
          'Muc toi thieu': warehouseMap[item.warehouseId]?.minStockTons || 0,
        }));
        fileName = `BaoCao_TonKho_XiMang_${Date.now()}.xlsx`;
        sheetName = 'TonKho';
      }

      if (kind === 'receivable') {
        rows = receivables.map((item) => ({
          'Khach hang': customerMap[item.customerId]?.name || item.customerId,
          'Don hang': orders.find((order) => order.id === item.orderId)?.code || item.orderId,
          'Han thanh toan': shortDate(item.dueDate),
          'Gia tri': item.amount,
          'Da thu': item.paidAmount,
          'Con lai': item.amount - item.paidAmount,
          'Trang thai': item.status,
        }));
        fileName = `BaoCao_CongNo_XiMang_${Date.now()}.xlsx`;
        sheetName = 'CongNo';
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      showNotification('Da xuat Excel thanh cong.', 'success');
    } catch (error: any) {
      showNotification(`Khong the xuat Excel: ${error?.message || 'loi khong xac dinh'}`, 'error');
    }
  };

  const handlePrintReport = () => {
    const html = `
      <html>
        <head>
          <title>XI MANG TIEN SON - Bao cao dieu hanh</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin-bottom: 4px; }
            p { color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>XI MANG TIEN SON</h1>
          <p>Dashboard dieu hanh ban hang noi bo va phan phoi xi mang</p>
          <table>
            <thead>
              <tr><th>Ma don</th><th>Khach hang</th><th>Trang thai</th><th>So tan</th><th>Doanh thu</th></tr>
            </thead>
            <tbody>
              ${orders.map((order) => `
                <tr>
                  <td>${order.code}</td>
                  <td>${customerMap[order.customerId]?.name || order.customerId}</td>
                  <td>${order.status}</td>
                  <td>${order.lines.reduce((sum, line) => sum + line.quantityTons, 0)}</td>
                  <td>${currency(getOrderAmount(order))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const reportWindow = window.open('', '_blank', 'width=1280,height=900');
    if (!reportWindow) {
      showNotification('Trinh duyet da chan cua so in PDF.', 'error');
      return;
    }
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  return (
    <div className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top_left,#1d4ed8_0%,#0f172a_22%,#020617_100%)]">
      <div className="max-w-7xl mx-auto px-5 py-5 space-y-5 text-slate-100">
        <div className="rounded-3xl border border-sky-500/20 bg-slate-950/70 p-6 shadow-[0_30px_100px_rgba(2,6,23,0.7)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-[11px] uppercase tracking-[0.32em] text-sky-300">XI MANG TIEN SON ERP</div>
              <h1 className="mt-3 text-3xl font-bold text-white">Quan ly ban hang noi bo va phan phoi xi mang</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Mot cockpit van hanh hop nhat cho CRM, ERP, POS, Workflow va AI Assistant. Don hang co the duoc tao tu hoi thoai Zalo/Facebook,
                tiep tuc qua phieu xuat kho, can xe, dieu xe, giao nhan, cong no va bao cao ma khong can nhap lieu nhieu lan.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleExportExcel('sales')} className="px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-200 text-sm hover:bg-sky-500/30">Xuat Excel ban hang</button>
              <button onClick={() => handleExportExcel('inventory')} className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-sm hover:bg-emerald-500/30">Xuat ton kho</button>
              <button onClick={() => handleExportExcel('receivable')} className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-200 text-sm hover:bg-amber-500/30">Xuat cong no</button>
              <button onClick={handlePrintReport} className="px-4 py-2 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/30 text-fuchsia-200 text-sm hover:bg-fuchsia-500/30">In / PDF</button>
              <button onClick={resetDemoData} className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 text-sm hover:bg-slate-700">Reset demo</button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <SummaryCard label="Doanh thu" value={currency(totals.revenue)} hint="Tong doanh thu tren don hang dang theo doi" />
          <SummaryCard label="San luong" value={tons(totals.soldTons)} hint="Tong san luong da len don" />
          <SummaryCard label="Ton kho" value={tons(totals.stockTons)} hint="Tong ton hien huu tren cac kho" />
          <SummaryCard label="Xe dang di" value={`${totals.trucksMoving}`} hint="Xe dang trong bai can va tren duong" />
          <SummaryCard label="Cong no qua han" value={currency(totals.overdueDebt)} hint="Gia tri can xu ly uu tien" />
          <SummaryCard label="Don moi" value={`${orders.filter((item) => item.status === 'pending').length}`} hint="Don cho xac nhan / sinh PXK" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Section title="Workflow tu dong" subtitle="Chuoi nghiep vu tu kenh chat den giao hang va cham soc sau ban.">
            <div className="grid gap-3 md:grid-cols-5">
              {pipeline.map((step) => (
                <div key={step.label} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                  <div className={`w-10 h-10 rounded-xl ${step.color} mb-3`} />
                  <div className="text-sm text-white font-semibold leading-5">{step.label}</div>
                  <div className="text-2xl font-bold text-slate-100 mt-3">{step.count}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Canh bao van hanh" subtitle="Diem nghen can can thiep ngay trong ngay.">
            <div className="space-y-3 text-sm">
              {alerts.overdue.map((item) => (
                <div key={item.id} className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                  <div className="text-red-200 font-medium">Cong no qua han</div>
                  <div className="text-slate-200 mt-1">{customerMap[item.customerId]?.name}: {currency(item.amount - item.paidAmount)}</div>
                </div>
              ))}
              {alerts.pendingWeigh.map((item) => (
                <div key={item.id} className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                  <div className="text-amber-200 font-medium">Cho doi chieu can xe</div>
                  <div className="text-slate-200 mt-1">Xe {item.truckPlate} - du kien {item.expectedNetKg.toLocaleString('vi-VN')} kg</div>
                </div>
              ))}
              {alerts.stockAlerts.map((item) => (
                <div key={item.id} className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3">
                  <div className="text-sky-200 font-medium">Canh bao ton kho</div>
                  <div className="text-slate-200 mt-1">{item.productName} con {tons(item.quantityTons - item.reservedTons)} tai {warehouseMap[item.warehouseId]?.name}</div>
                </div>
              ))}
              {!alerts.overdue.length && !alerts.pendingWeigh.length && !alerts.stockAlerts.length ? (
                <div className="text-slate-400 text-sm">Khong co canh bao nghiem trong.</div>
              ) : null}
            </div>
          </Section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
          <Section title="Don hang va bao gia" subtitle="Quan ly bao gia, don dat hang, chiet khau, khuyen mai va lich su cap nhat.">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="text-left py-2 pr-3">Ma don</th>
                    <th className="text-left py-2 pr-3">Khach hang</th>
                    <th className="text-left py-2 pr-3">Kenh</th>
                    <th className="text-left py-2 pr-3">San luong</th>
                    <th className="text-left py-2 pr-3">Gia tri</th>
                    <th className="text-left py-2 pr-3">Trang thai</th>
                    <th className="text-right py-2">Tac vu</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-900/80 align-top">
                      <td className="py-3 pr-3">
                        <div className="text-white font-medium">{order.code}</div>
                        <div className="text-xs text-slate-500">Giao {shortDate(order.deliveryDate)}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <div>{customerMap[order.customerId]?.name || order.customerId}</div>
                        <div className="text-xs text-slate-500">{order.salesRep}</div>
                      </td>
                      <td className="py-3 pr-3 uppercase text-xs text-slate-300">{order.channelSource}</td>
                      <td className="py-3 pr-3">{tons(order.lines.reduce((sum, line) => sum + line.quantityTons, 0))}</td>
                      <td className="py-3 pr-3">{currency(getOrderAmount(order))}</td>
                      <td className="py-3 pr-3"><span className={`inline-flex px-2.5 py-1 rounded-full border text-xs ${statusClass(order.status)}`}>{order.status}</span></td>
                      <td className="py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button onClick={() => advanceOrderStatus(order.id)} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-xs text-slate-200 hover:bg-slate-700">Day workflow</button>
                          <button onClick={() => createDispatchNote(order.id)} className="px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-400/30 text-xs text-sky-200 hover:bg-sky-500/30">Sinh PXK</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Tao don nhanh" subtitle="Chuyen hoi thoai thanh bao gia va don hang chi trong mot thao tac.">
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Khach hang</label>
                <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white">
                  {customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">San pham</label>
                <select value={productId} onChange={(event) => {
                  setProductId(event.target.value);
                  const nextProduct = products.find((item) => item.id === event.target.value);
                  if (nextProduct) setUnitPrice(nextProduct.standardPrice);
                }} className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white">
                  {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">So tan</label>
                  <input type="number" value={quantityTons} onChange={(event) => setQuantityTons(Number(event.target.value))} className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Don gia</label>
                  <input type="number" value={unitPrice} onChange={(event) => setUnitPrice(Number(event.target.value))} className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nhan vien</label>
                  <input value={salesRep} onChange={(event) => setSalesRep(event.target.value)} className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Ngay giao</label>
                  <input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nguon du lieu</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['zalo', 'facebook', 'manual'] as const).map((item) => (
                    <button key={item} onClick={() => setSource(item)} className={`px-3 py-2 rounded-xl border text-sm ${source === item ? 'bg-sky-500/20 border-sky-400/40 text-sky-200' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
                      {item.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleCreateOrder} className="w-full rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400">Lap bao gia thanh don</button>
            </div>
          </Section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <Section title="Kho, xuat kho va ton kho" subtitle="Theo doi ton kho theo san pham, kho xuat, canh bao ton toi thieu va nhat ky xuat hang.">
            <div className="space-y-4">
              {warehouses.map((warehouse) => {
                const items = inventory.filter((item) => item.warehouseId === warehouse.id);
                const available = items.reduce((sum, item) => sum + (item.quantityTons - item.reservedTons), 0);
                return (
                  <div key={warehouse.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-white font-semibold">{warehouse.name}</div>
                        <div className="text-xs text-slate-500">{warehouse.location} · Thu kho: {warehouse.manager}</div>
                      </div>
                      <div className="text-sm text-slate-300">Ton kha dung: <span className="text-white font-semibold">{tons(available)}</span></div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3 mt-4">
                      {items.map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                          <div className="text-sm text-white font-medium">{item.productName}</div>
                          <div className="text-xs text-slate-500 mt-1">{item.cementType}</div>
                          <div className="mt-3 text-lg font-bold text-slate-100">{tons(item.quantityTons - item.reservedTons)}</div>
                          <div className="text-xs text-slate-500 mt-1">Da giu cho don: {tons(item.reservedTons)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Phieu xuat kho" subtitle="Tu dong sinh tu don duyet, luu lich su thay doi va doi chieu xe van chuyen.">
            <div className="space-y-3">
              {dispatchNotes.map((note) => (
                <div key={note.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-white font-semibold">{note.code}</div>
                      <div className="text-xs text-slate-500 mt-1">{customerMap[note.customerId]?.name} · {note.productName} · {tons(note.quantityTons)}</div>
                    </div>
                    <span className={`inline-flex px-2.5 py-1 rounded-full border text-xs ${statusClass(note.status)}`}>{note.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-400 mt-3">
                    <div>Kho xuat: <span className="text-slate-200">{warehouseMap[note.warehouseId]?.name}</span></div>
                    <div>Xe: <span className="text-slate-200">{note.truckPlate}</span></div>
                    <div>Lai xe: <span className="text-slate-200">{note.driverName}</span></div>
                    <div>Duyet boi: <span className="text-slate-200">{note.approvedBy}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Section title="Can xe" subtitle="Can lan 1 -> xuat hang -> can lan 2 -> phat hien sai lech.">
            <div className="space-y-3">
              {weighingTickets.map((ticket) => (
                <div key={ticket.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-white font-semibold">{ticket.truckPlate}</div>
                      <div className="text-xs text-slate-500 mt-1">Lan 1: {ticket.firstWeightKg.toLocaleString('vi-VN')} kg · Du kien {ticket.expectedNetKg.toLocaleString('vi-VN')} kg</div>
                    </div>
                    <span className={`inline-flex px-2.5 py-1 rounded-full border text-xs ${statusClass(ticket.status)}`}>{ticket.status}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-3">
                    {ticket.secondWeightKg ? `Lan 2: ${ticket.secondWeightKg.toLocaleString('vi-VN')} kg · Thuc te ${ticket.actualNetKg?.toLocaleString('vi-VN')} kg · Sai lech ${ticket.deviationKg?.toLocaleString('vi-VN')} kg` : 'Chua co ket qua can lan 2'}
                  </div>
                  {ticket.status === 'pending' ? (
                    <button onClick={() => reconcileWeighing(ticket.id)} className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/30 text-xs text-amber-200 hover:bg-amber-500/30">Chot ket qua can</button>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Van chuyen va giao nhan" subtitle="Doi xe, nha van chuyen, tien do giao hang, check-point cong va xac nhan giao nhan.">
            <div className="space-y-3">
              {trips.map((trip) => (
                <div key={trip.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-white font-semibold">{trip.truckPlate} · {trip.routeName}</div>
                      <div className="text-xs text-slate-500 mt-1">{trip.carrier} · Lai xe {trip.driverName} · ETA {shortDate(trip.eta)}</div>
                    </div>
                    <span className={`inline-flex px-2.5 py-1 rounded-full border text-xs ${statusClass(trip.status)}`}>{trip.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-400 mt-3">
                    <div>Checkpoint: <span className="text-slate-200">{trip.gateCheckpoint}</span></div>
                    <div>Chi phi VC: <span className="text-slate-200">{currency(trip.freightCost)}</span></div>
                  </div>
                  {trip.status !== 'delivered' ? (
                    <button onClick={() => markTripDelivered(trip.id)} className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-xs text-emerald-200 hover:bg-emerald-500/30">Xac nhan giao hang</button>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <Section title="Cong no" subtitle="Theo doi theo khach hang, don hang, dai ly va canh bao qua han.">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="text-left py-2 pr-3">Khach hang</th>
                    <th className="text-left py-2 pr-3">Don hang</th>
                    <th className="text-left py-2 pr-3">Han TT</th>
                    <th className="text-left py-2 pr-3">Con lai</th>
                    <th className="text-left py-2 pr-3">Trang thai</th>
                    <th className="text-right py-2">Tac vu</th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((item) => (
                    <tr key={item.id} className="border-b border-slate-900/80">
                      <td className="py-3 pr-3">{customerMap[item.customerId]?.name || item.customerId}</td>
                      <td className="py-3 pr-3">{orders.find((order) => order.id === item.orderId)?.code || item.orderId}</td>
                      <td className="py-3 pr-3">{shortDate(item.dueDate)}</td>
                      <td className="py-3 pr-3">{currency(item.amount - item.paidAmount)}</td>
                      <td className="py-3 pr-3"><span className={`inline-flex px-2.5 py-1 rounded-full border text-xs ${statusClass(item.status)}`}>{item.status}</span></td>
                      <td className="py-3 text-right">
                        <button onClick={() => recordPayment(item.id)} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-xs text-slate-200 hover:bg-slate-700">Ghi nhan thu tien</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="AI Assistant" subtitle="Goi y uu tien xu ly, nhac lich cham soc va sinh noi dung tu van.">
            <div className="space-y-3">
              {aiSuggestions.map((item) => (
                <div key={item} className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-slate-100 leading-6">{item}</div>
              ))}
            </div>
          </Section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Section title="Khach hang" subtitle="Dong bo tu Zalo, Facebook va nhap tay, theo doi cong no va chinh sach gia.">
            <div className="space-y-3">
              {customers.map((customer) => (
                <div key={customer.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-white font-semibold">{customer.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{customer.region} · {customer.segment} · Nguon {customer.source.toUpperCase()}</div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>Han muc: <span className="text-slate-100">{currency(customer.creditLimit)}</span></div>
                      <div className="mt-1">Cong no: <span className="text-slate-100">{currency(customer.outstandingDebt)}</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-400 mt-3">
                    <div>CS gia: <span className="text-slate-200">{customer.pricePolicy}</span></div>
                    <div>Lan cuoi: <span className="text-slate-200">{shortDate(customer.lastInteraction)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Audit log" subtitle="Lich su xu ly workflow, giao nhan, can xe, cong no va AI.">
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className={`rounded-2xl border p-4 ${severityClass(log.severity)}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-medium text-white">{log.actor}</div>
                    <div className="text-xs text-slate-400">{shortDate(log.createdAt)}</div>
                  </div>
                  <div className="text-sm text-slate-200 mt-2 leading-6">{log.message}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}