import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import storageRouter from "./storage";
import storesRouter from "./stores";
import sellerApplicationsRouter from "./seller-applications";
import ordersRouter from "./orders";
import accountProfileRouter from "./account-profile";
import adminRouter from "./admin";
import newsletterRouter from "./newsletter";
import sellerSupportRouter from "./seller-support";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(productsRouter);
router.use(storesRouter);
router.use(sellerApplicationsRouter);
router.use(ordersRouter);
router.use(accountProfileRouter);
router.use(adminRouter);
router.use(newsletterRouter);
router.use(sellerSupportRouter);

export default router;
