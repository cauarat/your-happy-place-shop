import { useState, useEffect } from "react";
import { getOrders, updateOrderStatus, Order, OrderStatus } from "@/lib/store";
import { format } from "date-fns";
import { Search, ChevronDown, Package } from "lucide-react";

const statusColors: Record<OrderStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Paid: "bg-green-100 text-green-800",
  Processing: "bg-blue-100 text-blue-800",
  Shipped: "bg-purple-100 text-purple-800",
  Delivered: "bg-gray-100 text-gray-800",
  Cancelled: "bg-red-100 text-red-800",
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      const data = await getOrders();
      setOrders(data);
    };
    
    fetchOrders();
    
    // Listen for cross-tab updates or local updates
    const handleUpdate = () => fetchOrders();
    window.addEventListener('ordersUpdated', handleUpdate);
    return () => window.removeEventListener('ordersUpdated', handleUpdate);
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    await updateOrderStatus(orderId, newStatus);
    const data = await getOrders(); // Refresh UI
    setOrders(data);
  };

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customerInfo.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customerInfo.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl tracking-tight mb-2">Orders</h1>
        <p className="text-muted-foreground">Manage and track customer orders.</p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by Order ID or Customer Name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border bg-white focus:outline-none focus:ring-1 focus:ring-black transition-shadow"
        />
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-24 bg-white border border-border flex flex-col items-center">
          <Package className="w-12 h-12 text-[#ccc] mb-4" />
          <h3 className="text-lg font-medium text-black">No orders found</h3>
          <p className="text-sm text-muted-foreground mt-1">When customers place orders, they will appear here.</p>
        </div>
      ) : (
        <div className="bg-white border border-border overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#fafafa] border-b border-border text-xs uppercase tracking-widest text-[#555]">
              <tr>
                <th className="px-6 py-4 font-semibold">Order</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Total</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-[#fafafa] transition-colors group">
                  <td className="px-6 py-5 font-mono font-medium">{order.id}</td>
                  <td className="px-6 py-5 text-muted-foreground">
                    {format(new Date(order.createdAt), "MMM d, yyyy h:mm a")}
                  </td>
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-medium text-black">{order.customerInfo.firstName} {order.customerInfo.lastName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{order.customerInfo.city}, {order.customerInfo.country}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-medium">${order.total.toFixed(2)}</td>
                  <td className="px-6 py-5">
                    <div className="relative inline-block">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                        className={`appearance-none pl-3 pr-8 py-1 text-xs font-semibold rounded-full border border-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/20 ${statusColors[order.status]}`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60" />
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right text-muted-foreground">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
