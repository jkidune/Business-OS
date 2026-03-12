import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import purchasesRouter from "./purchases";
import salesRouter from "./sales";
import campaignsRouter from "./campaigns";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(productsRouter);
router.use(purchasesRouter);
router.use(salesRouter);
router.use(campaignsRouter);

export default router;
