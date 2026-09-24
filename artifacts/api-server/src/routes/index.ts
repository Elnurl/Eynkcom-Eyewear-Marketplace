import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import authRouter from "./auth";
import storageRouter from "./storage";
import storesRouter from "./stores";
import sellerApplicationsRouter from "./seller-applications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(storageRouter);
router.use(productsRouter);
router.use(storesRouter);
router.use(sellerApplicationsRouter);

export default router;
