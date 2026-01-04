import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { useProduct } from "@/hooks/use-products";
import ProductVariants from "./ProductVariants";

export default function ProductVariantsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: product, isLoading } = useProduct(id || "");

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!product) {
        return <div>Product not found</div>;
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={`Variants: ${product.name}`}
                description={`Manage variants for SKU: ${product.sku_master}`}
                action={
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate("/products")}>
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/products/${id}`)}>
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit Details
                        </Button>
                    </div>
                }
            />

            <ProductVariants productId={id!} />
        </div>
    );
}
