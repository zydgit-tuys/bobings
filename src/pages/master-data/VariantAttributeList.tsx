import { useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useVariantAttributes,
  useCreateVariantAttribute,
  useUpdateVariantAttribute,
  useDeleteVariantAttribute,
  useCreateAttributeValue,
  useUpdateAttributeValue,
  useDeleteAttributeValue,
} from "@/hooks/use-products";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";

interface AttributeValue {
  id: string;
  value: string;
  sort_order: number;
  attribute_id: string;
}

interface VariantAttribute {
  id: string;
  name: string;
  attribute_values: AttributeValue[];
}

export function VariantAttributeList() {
  const isMobile = useIsMobile();
  const { data: attributes, isLoading } = useVariantAttributes();
  const createAttribute = useCreateVariantAttribute();
  const updateAttribute = useUpdateVariantAttribute();
  const deleteAttribute = useDeleteVariantAttribute();
  const createValue = useCreateAttributeValue();
  const updateValue = useUpdateAttributeValue();
  const deleteValue = useDeleteAttributeValue();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Attribute dialog state
  const [attrDialogOpen, setAttrDialogOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<VariantAttribute | null>(null);
  const [attrName, setAttrName] = useState("");
  const [deleteAttrId, setDeleteAttrId] = useState<string | null>(null);

  // Value dialog state
  const [valueDialogOpen, setValueDialogOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<AttributeValue | null>(null);
  const [valueName, setValueName] = useState("");
  const [valueAttrId, setValueAttrId] = useState<string | null>(null);
  const [deleteValueId, setDeleteValueId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  // Attribute handlers
  const handleAddAttribute = () => {
    setEditingAttr(null);
    setAttrName("");
    setAttrDialogOpen(true);
  };

  const handleEditAttribute = (attr: VariantAttribute) => {
    setEditingAttr(attr);
    setAttrName(attr.name);
    setAttrDialogOpen(true);
  };

  const handleSaveAttribute = async () => {
    if (!attrName.trim()) {
      toast.error("Attribute name is required");
      return;
    }

    try {
      if (editingAttr) {
        await updateAttribute.mutateAsync({ id: editingAttr.id, name: attrName.trim() });
      } else {
        await createAttribute.mutateAsync(attrName.trim());
      }
      setAttrDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteAttribute = async () => {
    if (!deleteAttrId) return;
    try {
      await deleteAttribute.mutateAsync(deleteAttrId);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setDeleteAttrId(null);
    }
  };

  // Value handlers
  const handleAddValue = (attributeId: string) => {
    setEditingValue(null);
    setValueName("");
    setValueAttrId(attributeId);
    setValueDialogOpen(true);
  };

  const handleEditValue = (value: AttributeValue) => {
    setEditingValue(value);
    setValueName(value.value);
    setValueAttrId(value.attribute_id);
    setValueDialogOpen(true);
  };

  const handleSaveValue = async () => {
    if (!valueName.trim() || !valueAttrId) {
      toast.error("Value name is required");
      return;
    }

    try {
      if (editingValue) {
        await updateValue.mutateAsync({ id: editingValue.id, data: { value: valueName.trim() } });
      } else {
        const attr = attributes?.find((a: VariantAttribute) => a.id === valueAttrId);
        const maxSortOrder = attr?.attribute_values?.length ?? 0;
        await createValue.mutateAsync({
          attribute_id: valueAttrId,
          value: valueName.trim(),
          sort_order: maxSortOrder,
        });
      }
      setValueDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteValue = async () => {
    if (!deleteValueId) return;
    try {
      await deleteValue.mutateAsync(deleteValueId);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setDeleteValueId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAddAttribute} size={isMobile ? "sm" : "default"}>
          <Plus className="h-4 w-4 mr-2" />
          Add Attribute
        </Button>
      </div>

      {!attributes || attributes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No variant attributes found. Add your first attribute (e.g., Size, Color).
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {attributes.map((attr: VariantAttribute) => (
            <Card key={attr.id}>
              <Collapsible
                open={expandedIds.has(attr.id)}
                onOpenChange={() => toggleExpanded(attr.id)}
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary transition-colors">
                      {expandedIds.has(attr.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <CardTitle className="text-base font-medium">
                        {attr.name}
                      </CardTitle>
                      <Badge variant="secondary" className="ml-2">
                        {attr.attribute_values?.length ?? 0} values
                      </Badge>
                    </CollapsibleTrigger>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAttribute(attr);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteAttrId(attr.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 px-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {attr.attribute_values?.length > 0 ? (
                        attr.attribute_values
                          .sort((a: AttributeValue, b: AttributeValue) => a.sort_order - b.sort_order)
                          .map((val: AttributeValue) => (
                            <Badge
                              key={val.id}
                              variant="outline"
                              className="flex items-center gap-1 py-1 px-2"
                            >
                              <span>{val.value}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => handleEditValue(val)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => setDeleteValueId(val.id)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </Badge>
                          ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No values defined
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddValue(attr.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Value
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      {/* Attribute Dialog */}
      <Dialog open={attrDialogOpen} onOpenChange={setAttrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAttr ? "Edit Attribute" : "Add Attribute"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="attrName">Attribute Name</Label>
              <Input
                id="attrName"
                value={attrName}
                onChange={(e) => setAttrName(e.target.value)}
                placeholder="e.g., Size, Color, Material"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttrDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAttribute}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Value Dialog */}
      <Dialog open={valueDialogOpen} onOpenChange={setValueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingValue ? "Edit Value" : "Add Value"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="valueName">Value</Label>
              <Input
                id="valueName"
                value={valueName}
                onChange={(e) => setValueName(e.target.value)}
                placeholder="e.g., S, M, L, XL or Red, Blue, Green"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValueDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveValue}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Attribute Confirm */}
      <ConfirmDialog
        open={!!deleteAttrId}
        onOpenChange={(open) => !open && setDeleteAttrId(null)}
        title="Delete Attribute"
        description="Are you sure you want to delete this attribute? All associated values will also be deleted."
        onConfirm={handleDeleteAttribute}
      />

      {/* Delete Value Confirm */}
      <ConfirmDialog
        open={!!deleteValueId}
        onOpenChange={(open) => !open && setDeleteValueId(null)}
        title="Delete Value"
        description="Are you sure you want to delete this value?"
        onConfirm={handleDeleteValue}
      />
    </div>
  );
}
