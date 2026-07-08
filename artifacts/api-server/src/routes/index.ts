import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dictionariesRouter from "./dictionaries";
import fieldsRouter from "./fields";
import dashboardRouter from "./dashboard";
import excelRouter from "./excel";
import supabaseRouter from "./supabase";

const router: IRouter = Router();

router.use(healthRouter);
router.use(excelRouter);
router.use(dictionariesRouter);
router.use(fieldsRouter);
router.use(dashboardRouter);
router.use(supabaseRouter);

export default router;
