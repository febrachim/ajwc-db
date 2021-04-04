import pug from 'pug';
import { Sector } from './model/sector';
import { Country, CountryType } from './model/country';
import { Stage } from './model/stage';
import { Action } from './model/action';
import { Category, CategoryType } from './model/category';
import { HiringStatus, HiringStatusType, OpenStatus } from './model/hiring_status';
import { PipelineExtra } from './model/pipeline_extras';
import { capitalize, error, formatStatus } from '../core/utils';
import { Messages } from './messages';
import { permissions } from '../user/permissions';
import config from '../../../config';

export const MasterController = {};
export default { MasterController };

const { sectorMsg, subsectorMsg, countryMsg, stageMsg, actionMsg, categoryMsg,
  subcategoryMsg, statusMsg } = Messages;
const { ROLE } = CategoryType;
const { HIRING } = HiringStatusType;

MasterController.createSectorView = async (req, res) => {
  const parents = await Sector.getParents();
  res.render('master/views/createParent', { parents: parents.serialize(), link: '/sectors', title: 'Sector' });
};

MasterController.createSector = async (req, res, next) => {
  const { parent_id: parentId = 0 } = req.body;

  const getOrder = Sector.getMaxOrder(parentId);

  const name = capitalize(req.body.name);

  const getSector = await Sector.get({ name });

  const [sector, order] = await Promise.all([getSector, getOrder]);

  if (sector) {
    // Creating sector
    if (parentId === 0) return next(error('sector.danger', sectorMsg.create_duplicate(name)));
    // Creating sub sector
    return next(error('subsector.danger', subsectorMsg.create_duplicate(name)));
  }

  await Sector.forge({ name, parent_id: parentId, user_id: req.user.id, order }).save();

  if (parentId === 0) req.flash('success', sectorMsg.create_success(name));
  else req.flash('success', subsectorMsg.create_success(name));

  return res.redirect('/sectors');
};

MasterController.viewSectors = async (req, res) => {
  const title = 'Sector';
  const link = '/sectors';
  const sectors = await Sector.getParentsChildren();
  const perms = { ADD: req.session.permissions.includes(permissions.SECTOR_ADD),
    EDIT: req.session.permissions.includes(permissions.SECTOR_EDIT),
    DELETE: req.session.permissions.includes(permissions.SECTOR_DELETE) };
  return res.render('master/views/viewParent', {
    items: sectors.serialize(),
    title,
    link,
    type: 'sectors',
    masterPerms: perms });
};

MasterController.editSectorView = async (req, res) => {
  const { id } = req.params;
  const title = 'Sector';
  const link = '/sectors';
  const getParents = Sector.getParents();
  const getSector = Sector.get({ id });
  const [sector, parents] = await Promise.all([getSector, getParents]);
  if (!sector) throw new Error(error('danger', sectorMsg.not_found, '/sectors'));
  return res.render('master/views/editParent', { item: sector.serialize(), parents: parents.serialize(), title, link });
};

MasterController.editSector = async (req, res, next) => {
  const { id } = req.params;
  const { parent_id: parentId, former_parent_id: former } = req.body;
  const name = capitalize(req.body.name);
  const getChild = Sector.get({ parent_id: id });
  const findDuplicate = Sector.get({ name });
  const [child, duplicate] = await Promise.all([getChild, findDuplicate]);
  if (parentId === id) return next(error('danger', sectorMsg.edit_parent));
  if (String(parentId) !== former) {
    // If sector has a child but wants to be a subsector
    if (child && parentId !== 0) return next(error('danger', sectorMsg.edit_has_child));
  }
  if (duplicate) return next(error('danger', sectorMsg.create_duplicate(name)));
  await Sector.where({ id }).save({ name, parent_id: parentId }, { patch: true });
  req.flash('success', sectorMsg.edit_success);
  return res.redirect('/sectors');
};

MasterController.deleteSector = async (req, res, next) => {
  const { id } = req.params;
  const child = await Sector.get({ parent_id: id });
  if (child) return next(error('danger', sectorMsg.delete_has_child, '/sectors'));
  await Sector.where({ id }).save({ deleted_at: new Date() }, { patch: true });
  req.flash('success', sectorMsg.delete_success);
  return res.redirect('/sectors');
};

MasterController.createCountriesView = async (req, res) => {
  const types = formatStatus(CountryType);
  res.render('master/views/create', { title: 'Country', link: '/countries', type: 'Create', types });
};

MasterController.createStagesView = async (req, res) => res.render('master/views/create', { title: 'Stage', link: '/stages', type: 'Create' });

MasterController.createActionsView = async (req, res) => res.render('master/views/create', { title: 'Progress Status', link: '/actions', type: 'Create' });

MasterController.createCountries = async (req, res, next) => {
  const name = capitalize(req.body.name);
  const country = await Country.get({ name });
  if (country) return next(error('danger', countryMsg.create_duplicate(name)));
  await Country.forge({ name, order: req.body.order }).save();
  req.flash('success', countryMsg.create_success(name));
  return res.redirect('/countries');
};

MasterController.createStages = async (req, res, next) => {
  const name = capitalize(req.body.name);
  const stage = await Stage.get({ name });
  if (stage) return next(error('danger', stageMsg.create_duplicate(name)));
  await Stage.forge({ name, user_id: req.user.id }).save();
  req.flash('success', stageMsg.create_success(name));
  return res.redirect('/stages');
};

MasterController.createActions = async (req, res, next) => {
  const name = capitalize(req.body.name);
  const action = await Action.get({ name });
  if (action) return next(error('danger', actionMsg.create_duplicate(name)));
  await Action.forge({ name, user_id: req.user.id }).save();
  req.flash('success', actionMsg.create_success(name));
  return res.redirect('/actions');
};

MasterController.viewCountries = async (req, res) => {
  const title = 'Country';
  const link = '/countries';
  const { page = 1 } = req.query;
  const countries = await Country.getAll({}, { page, pageSize: 15 });
  const { pagination } = countries;
  const perms = { ADD: req.session.permissions.includes(permissions.COUNTRY_ADD),
    EDIT: req.session.permissions.includes(permissions.COUNTRY_EDIT),
    DELETE: req.session.permissions.includes(permissions.COUNTRY_DELETE) };
  return res.render('master/views/viewPage', {
    title,
    items: countries.serialize(),
    ...pagination,
    link,
    masterPerms: perms });
};

MasterController.viewStages = async (req, res) => {
  const title = 'Stage';
  const link = '/stages';
  const stages = await Stage.getAll();
  const perms = { ADD: req.session.permissions.includes(permissions.FUNDRAISING_STAGE_ADD),
    EDIT: req.session.permissions.includes(permissions.FUNDRAISING_STAGE_EDIT),
    DELETE: req.session.permissions.includes(permissions.FUNDRAISING_STAGE_DELETE) };
  return res.render('master/views/view', {
    title,
    items: stages.serialize(),
    link,
    masterPerms: perms });
};

MasterController.viewActions = async (req, res) => {
  const title = 'Progress Status';
  const link = '/actions';
  const actions = await Action.getAll();
  const perms = { ADD: req.session.permissions.includes(permissions.PROGRESS_STATUS_ADD),
    EDIT: req.session.permissions.includes(permissions.PROGRESS_STATUS_EDIT),
    DELETE: req.session.permissions.includes(permissions.PROGRESS_STATUS_DELETE) };
  return res.render('master/views/view', {
    title,
    items: actions.serialize(),
    link,
    type: 'actions',
    masterPerms: perms });
};

MasterController.editCountryView = async (req, res, next) => {
  const { id } = req.params;
  const title = 'Country';
  const link = '/countries';
  const types = formatStatus(CountryType);
  const country = await Country.get({ id });
  if (!country) return next(error('danger', countryMsg.not_found, '/countries'));
  return res.render('master/views/create', { title, link, type: 'Edit', item: country.serialize(), types });
};

MasterController.editStageView = async (req, res, next) => {
  const { id } = req.params;
  const title = 'Stage';
  const link = '/stages';
  const stage = await Stage.get({ id });
  if (!stage) return next(error('danger', stageMsg.not_found, '/stages'));
  return res.render('master/views/create', { title, link, type: 'Edit', item: stage.serialize() });
};

MasterController.editActionView = async (req, res, next) => {
  const { id } = req.params;
  const title = 'Progress Status';
  const link = '/actions';
  const action = await Action.get({ id });
  if (!action) return next(error('danger', actionMsg.not_found, '/actions'));
  return res.render('master/views/create', { title, link, type: 'Edit', item: action.serialize() });
};

MasterController.editCountry = async (req, res, next) => {
  const { id } = req.params;
  const name = capitalize(req.body.name);
  const getCountry = Country.get({ id });
  const findDuplicate = Country.get({ name });
  const [country, duplicate] = await Promise.all([getCountry, findDuplicate]);
  if (!country) return next(error('danger', countryMsg.not_found, '/countries'));
  if (duplicate && duplicate.get('id') !== country.get('id')) return next(error('danger', countryMsg.create_duplicate(name)));
  await Country.where({ id }).save({ name, order: req.body.order }, { patch: true });
  req.flash('success', countryMsg.edit_success);
  return res.redirect('/countries');
};

MasterController.editStage = async (req, res, next) => {
  const { id } = req.params;
  const name = capitalize(req.body.name);
  const getStage = Stage.get({ id });
  const findDuplicate = Stage.get({ name });
  const [stage, duplicate] = await Promise.all([getStage, findDuplicate]);
  if (!stage) return next(error('danger', stageMsg.not_found, '/stages'));
  if (duplicate) return next(error('danger', stageMsg.create_duplicate(name)));
  await Stage.where({ id }).save({ name }, { patch: true });
  req.flash('success', stageMsg.edit_success);
  return res.redirect('/stages');
};

MasterController.editAction = async (req, res, next) => {
  const { id } = req.params;
  const name = capitalize(req.body.name);
  const getAction = Action.get({ id });
  const findDuplicate = Action.get({ name });
  const [action, duplicate] = await Promise.all([getAction, findDuplicate]);
  if (!action) return next(error('danger', actionMsg.not_found, '/actions'));
  if (duplicate) return next(error('danger', actionMsg.create_duplicate(name)));
  await Action.where({ id }).save({ name }, { patch: true });
  req.flash('success', actionMsg.edit_success);
  return res.redirect('/actions');
};

MasterController.deleteCountry = async (req, res) => {
  const { id } = req.params;
  await Country.where({ id }).save({ deleted_at: new Date() }, { patch: true });
  req.flash('success', countryMsg.delete_success);
  return res.redirect('/countries');
};

MasterController.deleteStage = async (req, res) => {
  const { id } = req.params;
  await Stage.where({ id }).save({ deleted_at: new Date() }, { patch: true });
  req.flash('success', stageMsg.delete_success);
  return res.redirect('/stages');
};

MasterController.deleteAction = async (req, res) => {
  const { id } = req.params;
  await Action.where({ id }).save({ deleted_at: new Date() }, { patch: true });
  req.flash('success', actionMsg.delete_success);
  return res.redirect('/actions');
};

MasterController.createCategoryView = async (req, res) => {
  const type = Category.getType(req.path);
  const title = type === ROLE ? 'Role Category' : 'Relationship Category';
  const link = type === ROLE ? '/role-categories' : '/rel-categories';
  const parents = await Category.getParents(type);
  res.render('master/views/createParent', { parents: parents.serialize(), title, link });
};

MasterController.createCategory = async (req, res, next) => {
  const type = Category.getType(req.path);
  const link = type === ROLE ? '/role-categories' : '/rel-categories';
  const { parent_id: parentId = 0 } = req.body;
  const name = capitalize(req.body.name);
  console.log({ type, parentId })
  const getOrder = Category.getMaxOrder(type, parentId);
  const getCategory = Category.get({ name, type });
  const [category, order] = await Promise.all([getCategory, getOrder]);
  if (category) {
    // Creating category
    if (parentId === 0) return next(error('category.danger', categoryMsg.create_duplicate(name)));
    // Creating sub category
    return next(error('subcategory.danger', subcategoryMsg.create_duplicate(name)));
  }

  await Category.forge({ name, parent_id: parentId, user_id: req.user.id, type, order }).save();
  if (parentId === 0) req.flash('success', categoryMsg.create_success(name));
  else req.flash('success', subcategoryMsg.create_success(name));
  return res.redirect(link);
};

MasterController.viewCategories = async (req, res) => {
  const type = Category.getType(req.path);
  const title = type === ROLE ? 'Role Category' : 'Relationship Category';
  const link = type === ROLE ? '/role-categories' : 'rel-categories';
  const categories = await Category.getParentsChildren(type);
  const perms = { ADD: req.session.permissions.includes(permissions.ROLE_CATEGORY_ADD),
    EDIT: req.session.permissions.includes(permissions.ROLE_CATEGORY_EDIT),
    DELETE: req.session.permissions.includes(permissions.ROLE_CATEGORY_DELETE) };
  return res.render('master/views/viewParent', {
    items: categories.serialize(),
    title,
    link,
    type: 'categories',
    masterPerms: perms });
};

MasterController.editCategoryView = async (req, res, next) => {
  const type = Category.getType(req.path);
  const { id } = req.params;
  const title = type === ROLE ? 'Role Category' : 'Relationship Category';
  const link = type === ROLE ? '/role-categories' : '/rel-categories';
  const getParents = Category.getParents(type);
  const getCategory = Category.get({ id, type });
  const [category, parents] = await Promise.all([getCategory, getParents]);
  if (!category) return next(error('danger', categoryMsg.not_found(title), link));
  return res.render('master/views/editParent', { item: category.serialize(), parents: parents.serialize(), title, link });
};

MasterController.editCategory = async (req, res, next) => {
  const type = Category.getType(req.path);
  const title = type === ROLE ? 'Role Category' : 'Relationship Category';
  const link = type === ROLE ? '/role-categories' : '/rel-categories';
  const { id } = req.params;
  const { parent_id: parentId, former_parent_id: former } = req.body;
  const name = capitalize(req.body.name);
  const getChild = Category.get({ parent_id: id, type });
  const findDuplicate = Category
  .where('id', 'IS NOT', id)
  .get({ name, type });
  const [child, duplicate] = await Promise.all([getChild, findDuplicate]);
  if (parentId === id) return next(error('danger', categoryMsg.edit_parent));
  if (String(parentId) !== former) {
    // If sector has a child but wants to be a subsector
    if (child && parentId !== 0) return next(error('danger', categoryMsg.edit_has_child));
  }
  if (duplicate) return next(error('danger', categoryMsg.create_duplicate(name)));
  await Category.where({ id, type }).save({ name, parent_id: parentId }, { patch: true });
  req.flash('success', categoryMsg.edit_success(title));
  return res.redirect(link);
};

MasterController.deleteCategory = async (req, res, next) => {
  const type = Category.getType(req.path);
  const title = type === ROLE ? 'Role Category' : 'Relationship Category';
  const link = type === ROLE ? '/role-categories' : '/rel-categories';
  const { id } = req.params;
  const child = await Category.get({ parent_id: id });
  if (child) return next(error('danger', categoryMsg.delete_has_child, link));
  await Category.where({ id, type }).save({ deleted_at: new Date() }, { patch: true });
  req.flash('success', categoryMsg.delete_success(title));
  return res.redirect(link);
};

MasterController.createHiringStatusView = async (req, res) => {
  const type = HiringStatus.getType(req.path);
  const title = type === HIRING ? 'Hiring Status' : 'Candidate Status';
  const link = type === HIRING ? '/hiring-statuses' : '/candidate-statuses';
  const statuses = formatStatus(OpenStatus);
  res.render('master/views/create', { title, link, type: 'Create', statuses });
};

MasterController.createHiringStatus = async (req, res, next) => {
  const type = HiringStatus.getType(req.path);
  const link = type === HIRING ? '/hiring-statuses' : '/candidate-statuses';
  const name = capitalize(req.body.name);
  const check = await HiringStatus.get({ name, type });
  if (check) return next(error('danger', statusMsg.create_duplicate(name)));
  const data = { name, user_id: req.user.id, type };
  if (type === HIRING) data.status = req.body.status;
  await HiringStatus.forge(data).save();
  req.flash('success', statusMsg.create_success(name));
  return res.redirect(link);
};

MasterController.editHiringStatusView = async (req, res, next) => {
  const type = HiringStatus.getType(req.path);
  const { id } = req.params;
  const title = type === HIRING ? 'Hiring Status' : 'Candidate Status';
  const link = type === HIRING ? '/hiring-statuses' : '/candidate-statuses';
  const status = await HiringStatus.get({ id, type });
  if (!status) return next(error('danger', statusMsg.not_found, link));
  const statuses = formatStatus(OpenStatus);
  return res.render('master/views/create', { item: status.serialize(), title, link, type: 'Edit', statuses });
};

MasterController.editHiringStatus = async (req, res, next) => {
  const type = HiringStatus.getType(req.path);
  const link = type === HIRING ? '/hiring-statuses' : '/candidate-statuses';
  const { id } = req.params;
  const name = capitalize(req.body.name);
  const duplicate = await HiringStatus.get({ name, type });
  if (duplicate) return next(error('danger', statusMsg.create_duplicate(name)));
  const data = type === HIRING ? { name, status: req.body.status } : { name };
  await HiringStatus.where({ id, type }).save(data, { patch: true });
  req.flash('success', statusMsg.edit_success);
  return res.redirect(link);
};

MasterController.viewHiringStatus = async (req, res) => {
  const type = HiringStatus.getType(req.path);
  const title = type === HIRING ? 'Hiring Status' : 'Candidate Status';
  const link = type === HIRING ? '/hiring-statuses' : '/candidate-statuses';
  const statuses = await HiringStatus.getAll({ type });
  const perms = { ADD: req.session.permissions.includes(permissions.HIRING_STATUS_ADD),
    EDIT: req.session.permissions.includes(permissions.HIRING_STATUS_EDIT),
    DELETE: req.session.permissions.includes(permissions.HIRING_STATUS_DELETE) };
  return res.render('master/views/view', {
    title,
    items: statuses.serialize(),
    link,
    masterPerms: perms });
};

MasterController.deleteHiringStatus = async (req, res) => {
  const type = HiringStatus.getType(req.path);
  const link = type === HIRING ? '/hiring-statuses' : '/candidate-statuses';
  const { id } = req.params;
  await HiringStatus.where({ id, type }).save({ deleted_at: new Date() }, { patch: true });
  req.flash('success', statusMsg.delete_success);
  return res.redirect(link);
};

MasterController.createPipelineExtraView = async (req, res) => {
  const { title, link } = PipelineExtra.getType(req.path);
  res.render('master/views/create', { title, link, type: 'Create' });
};

MasterController.createPipelineExtra = async (req, res, next) => {
  const { link, msg, type } = PipelineExtra.getType(req.path);
  const name = capitalize(req.body.name);
  const check = await PipelineExtra.get({ name, type });
  if (check) return next(error('danger', msg.create_duplicate));
  console.log('dari pipeline', type)
  await PipelineExtra.forge({ name, user_id: req.user.id, type }).save();
  req.flash('success', msg.create_success);
  return res.redirect(link);
};

MasterController.editPipelineExtraView = async (req, res, next) => {
  const { title, link, msg, type } = PipelineExtra.getType(req.path);
  const { id } = req.params;
  const status = await PipelineExtra.get({ id, type });
  if (!status) return next(error('danger', msg.not_found, link));
  return res.render('master/views/create', { item: status.serialize(), title, link, type: 'Edit' });
};

MasterController.editPipelineExtra = async (req, res, next) => {
  const { link, msg, type } = PipelineExtra.getType(req.path);
  const { id } = req.params;
  const name = capitalize(req.body.name);
  const duplicate = await PipelineExtra.get({ name, type });
  if (duplicate) return next(error('danger', msg.create_duplicate));
  await PipelineExtra.where({ id, type }).save({ name }, { patch: true });
  req.flash('success', msg.edit_success);
  return res.redirect(link);
};

MasterController.viewPipelineExtra = async (req, res) => {
  const { type, title, link } = PipelineExtra.getType(req.path);
  const statuses = await PipelineExtra.getAll({ type });
  let permAdd;
  let permEdit;
  let permDelete;
  if (link === '/ratings') {
    permAdd = permissions.RATING_ADD;
    permEdit = permissions.RATING_EDIT;
    permDelete = permissions.RATING_DELETE;
  } else if (link === '/pipeline-statuses') {
    permAdd = permissions.DEAL_STATUS_ADD;
    permEdit = permissions.DEAL_STATUS_EDIT;
    permDelete = permissions.DEAL_STATUS_DELETE;
  } else if (link === '/priorities') {
    permAdd = permissions.PRIORITY_ADD;
    permEdit = permissions.PRIORITY_EDIT;
    permDelete = permissions.PRIORITY_DELETE;
  } else if (link === '/currencies') {
    permAdd = permissions.CURRENCY_ADD;
    permEdit = permissions.CURRENCY_EDIT;
    permDelete = permissions.CURRENCY_DELETE;
  }
  const perms = { ADD: req.session.permissions.includes(permAdd),
    EDIT: req.session.permissions.includes(permEdit),
    DELETE: req.session.permissions.includes(permDelete) };
  return res.render('master/views/view', {
    title,
    items: statuses.serialize(),
    link,
    masterPerms: perms });
};

MasterController.deletePipelineExtra = async (req, res) => {
  const { link, msg, type } = PipelineExtra.getType(req.path);
  const { id } = req.params;
  await PipelineExtra.where({ id, type }).save({ deleted_at: new Date() }, { patch: true });
  req.flash('success', msg.delete_success);
  return res.redirect(link);
};

MasterController.getSubsectors = async (req, res, next) => {
  const sectors = await Sector.getChildren(req.params.id);
  req.resData = { data: sectors.serialize() };
  return next();
};

MasterController.changeOrder = async (req, res, next) => {
  const { items, type } = req.body;
  let Model;
  if (type === 'categories') Model = Category;
  if (type === 'sectors') Model = Sector;
  if (type === 'actions') Model = Action;
  await Promise.all(items.map(item => Model.where('id', item.id).save({ order: item.order }, { patch: true, require: true })));
  return next();
};

MasterController.getChildren = async (req, res, next) => {
  const { type } = req.query;
  let Model;
  if (type === 'categories') {
    Model = Category;
  }

  if (type === 'sectors') {
    Model = Sector;
  }

  const perms = {
    EDIT: req.session.permissions.includes(permissions.SECTOR_EDIT),
    DELETE: req.session.permissions.includes(permissions.SECTOR_DELETE)
  };

  const children = await Model.getChildren(req.params.id);
  const html = pug.compileFile(`${config.modulePath}/master/views/tables.pug`)({
    children: children.serialize(),
    link: type === 'categories' ? `role-${type}` : type,
    parent: req.params.id,
    masterPerms: perms,
  });
  req.resData = { data: html };
  return next();
};

MasterController.getCountries = async (req, res, next) => {
  const { q = '', page } = req.query;
  const countries = await Country.getRegex(q, { page });
  const { pagination } = countries;
  req.resData = { data: countries.serialize({ api: true }), meta: pagination };
  return next();
};
