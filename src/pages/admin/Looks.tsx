import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getLooks, deleteLook, Look } from "@/lib/store";
import { Edit2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const AdminLooks = () => {
  const [looks, setLooks] = useState<Look[]>([]);
  const navigate = useNavigate();

  const loadLooks = () => {
    setLooks(getLooks());
  };

  useEffect(() => {
    loadLooks();
  }, []);

  const handleDelete = (id: string) => {
    toast("Are you sure?", {
      description: "This will permanently remove the look.",
      action: {
        label: "Delete",
        onClick: () => {
          deleteLook(id);
          loadLooks();
          toast.success("Look deleted");
        },
      },
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl tracking-tight mb-2">Community Looks</h1>
          <p className="text-muted-foreground">Manage your storefront styled looks.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to="/admin/looks/new" 
            className="bg-primary text-primary-foreground px-6 py-3 rounded-full uppercase text-xs tracking-wider flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Look
          </Link>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium">Look</th>
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium">Featured Products</th>
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {looks.map((look) => (
              <tr key={look.id} className="hover:bg-secondary/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-16 bg-secondary rounded-sm overflow-hidden flex-shrink-0">
                      <img src={look.modelImage} alt={look.name} className="w-full h-full object-cover object-top" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{look.name}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">{look.id}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm">
                  {look.productIds.length} item{look.productIds.length !== 1 ? 's' : ''}
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => navigate(`/admin/looks/${look.id}`)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(look.id)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {looks.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-muted-foreground text-sm">
                  No community looks found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminLooks;
