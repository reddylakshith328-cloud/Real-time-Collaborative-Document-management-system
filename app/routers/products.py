from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from ..database import get_db

from ..models import Product

from ..schemas import (
    ProductCreate,
    ProductUpdate
)

from ..services.security_service import (
    get_current_user,
    admin_required
)


router = APIRouter(
    prefix="/products",
    tags=["Products"]
)


@router.get("/")
def get_products(
    db: Session = Depends(get_db),
    current_user=Depends(
        get_current_user
    )
):

    products = db.query(
        Product
    ).all()

    return {
        "logged_in_user":
            current_user.email,

        "role":
            current_user.role,

        "products": [
            {
                "pid": product.pid,
                "pname": product.pname,
                "price": float(
                    product.price
                ),
                "warranty":
                    product.warranty
            }
            for product in products
        ]
    }


@router.post("/")
def add_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    admin=Depends(admin_required)
):

    product = Product(
        pname=product_data.pname,
        price=product_data.price,
        warranty=product_data.warranty
    )

    db.add(product)

    db.commit()

    db.refresh(product)

    return {
        "message":
            "Product added successfully",

        "product_id":
            product.pid,

        "added_by":
            admin.email
    }


@router.put("/{pid}")
def update_product(
    pid: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    admin=Depends(admin_required)
):

    product = (
        db.query(Product)
        .filter(
            Product.pid == pid
        )
        .first()
    )

    if product is None:

        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    product.pname = product_data.pname
    product.price = product_data.price
    product.warranty = product_data.warranty

    db.commit()

    db.refresh(product)

    return {
        "message":
            "Product updated successfully",

        "product_id":
            product.pid,

        "updated_by":
            admin.email
    }


@router.delete("/{pid}")
def delete_product(
    pid: int,
    db: Session = Depends(get_db),
    admin=Depends(admin_required)
):

    product = (
        db.query(Product)
        .filter(
            Product.pid == pid
        )
        .first()
    )

    if product is None:

        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    db.delete(product)

    db.commit()

    return {
        "message":
            "Product deleted successfully",

        "product_id":
            pid,

        "deleted_by":
            admin.email
    }