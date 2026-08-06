import { useEffect, useState } from "react";
import { getCustomerSuggestions, CustomerSuggestion } from "@/lib/store";
import { MessageSquare, Package, Search } from "lucide-react";

const AdminSuggestions = () => {
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);

  useEffect(() => {
    // Load initial suggestions
    const fetchSuggestions = async () => {
      const data = await getCustomerSuggestions();
      setSuggestions(data);
    };

    fetchSuggestions();

    // Listen for updates
    const handleUpdate = () => fetchSuggestions();
    
    window.addEventListener('suggestionsUpdated', handleUpdate);
    return () => window.removeEventListener('suggestionsUpdated', handleUpdate);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl tracking-tight mb-2">Feedback & Requests</h1>
        <p className="text-muted-foreground">View product requests and feedback submitted by users.</p>
      </div>

      <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
        {suggestions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No feedback or requests have been submitted yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Details</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {suggestions.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4">
                      {item.type === 'product_request' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold tracking-wide">
                          <Package className="w-3.5 h-3.5" />
                          Request
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold tracking-wide">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Feedback
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.type === 'product_request' ? (
                        <div className="space-y-1">
                          <p className="font-medium">{item.productName || 'Unknown Product'}</p>
                          {item.productBrand && <p className="text-xs text-muted-foreground uppercase tracking-wider">{item.productBrand}</p>}
                          {item.searchQuery && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                              <Search className="w-3 h-3" /> Searched: "{item.searchQuery}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground max-w-md">{item.message}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {item.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSuggestions;
