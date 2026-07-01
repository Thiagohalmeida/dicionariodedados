import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dictionariesRouter from "./dictionaries";
import fieldsRouter from "./fields";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dictionariesRouter);
router.use(fieldsRouter);
router.use(dashboardRouter);

export default router;
