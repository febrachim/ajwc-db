import express from 'express';
import { DescController } from './controller';
import core from '../core';
import { auth } from '../user/middleware';

const { wrap } = core.utils;
const { upload } = core.middleware;
const routes = express.Router();

routes.get('/files/:name',
  auth(),
  wrap(DescController.getFile));

routes.get('/files/report/:name',
  auth(),
  wrap(DescController.getFileReport));

routes.post('/upload',
  auth(),
  upload.array('documents'),
  wrap(DescController.insert));

routes.post('/companiesupload',
  auth(),
  upload.array('documents'),
  wrap(DescController.CompaniesImportExcel));

routes.post('/hiringsupload',
  auth(),
  upload.array('documents'),
  wrap(DescController.HiringsImportExcel));

routes.post('/peoplesupload',
  auth(),
  upload.array('documents'),
  wrap(DescController.PeopleImportExcel));

routes.post('/dealsupload',
  auth(),
  upload.array('documents'),
  wrap(DescController.DealsImportExcel));

export default routes;
