import { formatDocument } from "../core/utils";
import config from "../../../config";
import { capitalize, error, formatStatus, writeReport } from "../core/utils";
import Excel from 'exceljs';
// this for the model
import { Sector } from "../master/model/sector";
import { Company } from "../company/model/company";
import { CompanySector } from "../company/model/company_sector";
import { Country } from "../master/model/country";
import { Document } from "./model/document";
import { Note } from './model/note';
import { HiringStatus, HiringStatusType, OpenStatus } from '../master/model/hiring_status';
import { Hiring } from '../hiring/model/hiring'
import { Category, CategoryType } from '../master/model/category';
import { Pipeline } from '../pipeline/model/pipeline';
import { People } from '../people/model/people';
import { Action } from '../master/model/action';
import { Contact } from '../pipeline/model/contact';
import { PipelineExtra, PipelineExtraType } from '../master/model/pipeline_extras';
import { Stage } from '../master/model/stage'


// for stream path and file
import fs from "fs";
import path from "path";
import _ from "highland";
import exceljsStream from '../../../common/import-excel-stream'
import os from "os";

export const DescController = {};
export default { DescController };

DescController.getFile = (req, res, next) => {
  const { name } = req.params;
  // if there is error, go to 404 page
  res.download(`${config.filePath}/${name}`, formatDocument(name))
};

DescController.insert = async (req, res) => {
  const { ref_id: refId, ref_type, msg, redirect, deleteTemp } = req.body;
  const insertDocuments = req.files.map(file =>
    Document.forge({
      name: file.filename,
      ref_id: refId === "null" ? null : refId,
      ref_type,
      user_id: req.user.id
    }).save()
  );
  await insertDocuments;
  req.flash("success", msg);
  req.flash("delete", `${req.get("host")}${deleteTemp}`);
  return res.redirect(redirect);
};

DescController.getFileReport = (req, res, next) => {
  const { name } = req.params;
  // if there is error, go to 404 page
  res.download(`${config.filePathReport}/${name}`, formatDocument(name))
};
// https://github.com/caolan/highland/issues/669
// please read before changing the Import module
// for excel im using my own module you can find it on common folder

DescController.CompaniesImportExcel = async (req, res, next) => {
  // Read files with stream\
  if(req.files.length === 0) return res.redirect('/')

  const filename = req.files[0].filename
  const fileExt = path.extname(filename);
  const fileRename = filename.replace(fileExt, '.txt');
  const reportPath = config.filePathReport + '/' + fileRename;

  if(fileExt != '.xlsx') {
    fs.unlink(path.join(req.files[0].path), (err) => {
      if (err) throw err;
      console.log('deleted mallicious')
    })
    return res.redirect('/')
  }

  let file = fs
    .createReadStream(path.join(req.files[0].path))
    .pipe(exceljsStream({ worksheetName: 'Company' })).on('error', (err) => {
      return res.redirect('/')
    });

  writeReport(reportPath, '[START] Report Import Companies:')

  // Read data streams from here with highlandjs
  await _(file)
    .map(async (companyData) => {

      const sectorName = capitalize(companyData["Tech Category"]);
      const companyName = capitalize(companyData.Name);
      const companyCountry = capitalize(companyData.Country);
      const Notes = companyData.Notes;
      const getSector = await Sector.get({ name: sectorName });
      const getCompany = await Company.get({ name: companyName });
      const getCountry = await Country.get({ name: companyCountry });
      const [sector, company, country] = await Promise.all([
        getSector,
        getCompany,
        getCountry
      ]);

      let serSector;
      if (!sector) {
        writeReport(reportPath, `Sector ${sectorName} for ${companyName} not found please add on the admin`)
      } else {
        serSector = sector.serialize();
      }

      let serCountry;
      if (!country) {
        serCountry = await Country.forge({ name: companyCountry, order: 1
        }).save();
        writeReport(reportPath, `Saved new country named ${companyCountry} for ${companyName}`)
      } else {
        serCountry = country.serialize();
      }

      if (company) {
        writeReport(reportPath, `There is a company named ${companyName}`)
      } else {
        const saveCompany = await Company.forge({
          name: companyName,
          country_id: serCountry.id,
          user_id: req.user.id}).save();

        if(serSector) {
          CompanySector.forge({
            company_id: saveCompany.get("id"),
            sector_id: serSector.id }).save();
        }

        if(Notes){
          Note.forge({
            text: Notes,
            ref_id: saveCompany.get('id'),
            ref_type: 'companies',
            user_id: req.user.id
          }).save();
        }
      }
    })
    .flatMap(_)
    .filter((ignored) => false)
    .toPromise(Promise);
    // using higland with promises
    writeReport(reportPath, '[END] Report Import Hiring:')

  req.flash('report', `/files/report/${fileRename}`)
  return res.redirect("/companies")
};

DescController.HiringsImportExcel = async (req, res, next) => {

  if(req.files.length === 0) return res.redirect('/')

  const filename = req.files[0].filename
  const fileExt = path.extname(filename);
  const fileRename = filename.replace(fileExt, '.txt');
  const reportPath = config.filePathReport + '/' + fileRename;

  if(fileExt != '.xlsx') {
    fs.unlink(path.join(req.files[0].path), (err) => {
      if (err) throw err;
      console.log('deleted mallicious')
    })
    return res.redirect('/')
  }
  if(!filename) return res.redirect('/')

  let file = fs
    .createReadStream(path.join(req.files[0].path))
    .pipe(exceljsStream({ worksheetName: 'Company' })).on('error', (err) => {
      return res.redirect('/')
    });

  writeReport(reportPath, '[START] Report Import Hirings:')

  await _(file)
    .map( async (hiringData) => {

      const companyName = capitalize(hiringData.Company)
      const statusName = capitalize(hiringData.Status)
      const roleName = capitalize(hiringData.Role)

      // because the role name on excel arent using spaces
      const replacedRoleName = roleName.replace('/', ' / ')

      const getCompany = await Company.get({ name: companyName });
      const getStatus = await HiringStatus.get({ name: statusName })
      const getRole = await Category.get({ name: replacedRoleName })

      const [company, status, role] =  await Promise.all([getCompany, getStatus, getRole])

      const serCompany = company.serialize({ api: true })
      const getCheck = Hiring.get({ people_id: null, position: replacedRoleName, company_id: serCompany.id });
      const [check] = await Promise.all([getCheck])

      let savedRole;
      if(check) {
        writeReport(reportPath, `There is already an job opening ${replacedRoleName} on ${companyName}`)
      } else {
        if(company) {
          if(role) {
            role.serialize()
          } else if (roleName) {
            const getOrder = await Category.getMaxOrder({ type: 1, parentId: 0 });
            const [order] =  await Promise.all([getOrder])

            let newRole = await Category.forge({
              name: replacedRoleName,
              parent_id: 0,
              type: 1,
              user_id: req.user.id,
              order
            })
            savedRole = newRole.get('name')
            writeReport(reportPath, `success added role name ${savedRole}`)
          } else {
            writeReport(reportPath, `There is no role-category provided in ${companyName}`)
          }

          company.serialize()
          status.serialize()
          await Hiring.forge({
            company_id: company.id,
            position: replacedRoleName,
            position_hiring_status_id: status.id,
            candidate_hiring_status_id:  null,
            user_id: req.user.id
           }).save();
        } else {
          writeReport(reportPath, `There is no company named ${companyName} please add first`)
        }
      }
    })
    .flatMap(_)
    .filter((ignored) => false )
    .toPromise(Promise)

  req.flash('report', `/files/report/${fileRename}`)
  return res.redirect("/hirings")
}

DescController.PeopleImportExcel = async (req, res, next) => {
  if(req.files.length === 0) return res.redirect('/')

  const filename = req.files[0].filename
  const fileExt = path.extname(filename);
  const fileRename = filename.replace(fileExt, '.txt');
  const reportPath = config.filePathReport + '/' + fileRename;

  if(fileExt != '.xlsx') {
    fs.unlink(path.join(req.files[0].path), (err) => {
      if (err) throw err;
      console.log('deleted mallicious')
    })
    return res.redirect('/')
  }
  if(!filename) return res.redirect('/');

  let file = fs
    .createReadStream(path.join(req.files[0].path))
    .pipe(exceljsStream({ worksheetName: 'People' })).on('error', (err) => {
      return res.redirect('/')
    });

  writeReport(reportPath, 'Report Import Hirings:')

  await _(file)
    .map(async (peopleData) => {
      const peopleName = capitalize(peopleData.Name);
      const companyName = capitalize(peopleData.Company);
      const currentTitle = peopleData['currentTitle'];
      const currentRole = capitalize(peopleData.Role);
      const peopleContact = peopleData['Contact No.'];
      const peopleEmail = peopleData.Email ? peopleData.Email.text : null;
      const peopleNotes = peopleData.Notes;

      const getPeople = await People.get({ name: peopleName });
      const getCompany = await Company.get({ name: companyName });
      const getRole = await Category.get({ name: currentRole });

      const [people, company, role] = await Promise.all([
        getPeople,
        getCompany,
        getRole
      ])

      let serPeople;
      let serCompany;
      let serRole;
      if(company) {
        serCompany = company.serialize({ api: true })
      } else if (!companyName) {
        serCompany = null
        writeReport(reportPath, `Company name not provided on: ${peopleName}`)
      } else {
        serCompany = null
        writeReport(reportPath, `Company name not provided on: ${peopleName}`)
      }

      if(role) {
        serRole = role.serialize({ api: true})
      } else if (!currentRole) {
        serRole = null
      } else {
        serRole = null;
        writeReport(reportPath, `Role not provided on: ${peopleName}`)
      }

      if(people) {
        serPeople = people.serialize({ api: true })
        writeReport(reportPath, `There is people named ${peopleName} please update it on the web`)
      } else if (!peopleName) {
        writeReport(reportPath, `The name of people cannot be blank`)
      } else {
        const savedPeople = await People.forge({
          name: peopleName,
          country_id: null,
          email: peopleEmail,
          contact: peopleContact,
          user_id: req.user.id }).save();

        writeReport(reportPath, `People named ${peopleName} succesfully saved!`)

        if(serCompany) {
          PeopleCompany.forge({
            people_id: savedPeople.get('id'),
            company_id: serCompany.id,
            status: 1,
            title: currentTitle.trim() ? capitalize(currentTitle) : undefined,
            category_role_id: serRole ? Number(serRole.id) : undefined,
            user_id: req.user.id,
          }).save();
        }

        if(peopleNotes) {
          Note.forge({
            text: peopleNotes,
            ref_id: savedPeople.get('id'),
            ref_type: 'peoples',
            user_id: req.user.id,
          }).save();
        }
      }

    })
    .flatMap(_)
    .filter((ignored) => false )
    .toPromise(Promise)

  writeReport(reportPath, `[END] Report for people import ends!`)
  req.flash('report', `/files/report/${fileRename}`)
  return res.redirect('/people')
}

DescController.DealsImportExcel = async (req, res, next) => {
  if(req.files.length === 0) return res.redirect('/')

  const filename = req.files[0].filename;
  const fileExt = path.extname(filename);
  const fileRename = filename.replace(fileExt, '.txt');
  const reportPath = config.filePathReport + '/' + fileRename;

  // prevent other files make sure later
  if(fileExt != '.xlsx') {
    fs.unlink(path.join(req.files[0].path), (err) => {
      if (err) throw err;
      console.log('deleted mallicious')
    })
    return res.redirect('/')
  }
  if(!filename) return res.redirect('/')

  let file = fs
    .createReadStream(path.join(req.files[0].path))
    .pipe(exceljsStream({ worksheetName: 'Company' })).on('error', (err) => {
      return res.redirect('/')
    });

  writeReport(reportPath, '[START] Report Import Deals:')

  await _(file)
    .map( async (dealsData) => {
      // console.log(dealsData)

      // for spaccing
      const companyName = capitalize(dealsData.Company);
      const sectorName = capitalize(dealsData['Tech Category']);
      const textSector = dealsData.Sector;
      const countryName = capitalize(dealsData['Country Base']);
      const fundraisingStageName = capitalize(dealsData['Fundraising Stage']);
      const fundRaisedExc = dealsData['Fund Raised'];
      const fundRaiseOpenExc = dealsData['Fundraise Open'];
      const currencyName = dealsData.Currency;
      const premoneyValuationExc = dealsData['Pre-money Valuation'];
      const ratingsName = dealsData.Rating;
      const dealsNote = dealsData.Notes;
      // founder later, it can be doubtfull so search array on streams
      const founderName = dealsData.Founders;
      const notes = dealsData.Notes;
      const priorityDef = 8;

      const getCompany = await Company.get({ name: companyName });
      const getSector = await Sector.get({ name: sectorName });
      const getCountry = await Country.get({ name: countryName });
      const getFundRaise = await Stage.get({ name: fundraisingStageName })

      let getCurrency;
      let getRatings;
      if(currencyName) getCurrency = await PipelineExtra.get({ name: currencyName })
      if(ratingsName) getRatings = await PipelineExtra.get({ name: ratingsName })

      const [company, sector, country, fundraisestage, currency, ratings] = await Promise.all([
        getCompany,
        getSector,
        getCountry,
        getFundRaise,
        getCurrency,
        getRatings
      ])

      let serSector;
      let serCountry;
      let serFundraiseStage;
      let serCurrency;
      let serRatings;
      let serCompany;

      if(ratings) {
        serRatings = ratings.serialize()
      } else if (ratingsName) {
        serRatings = await PipelineExtra.forge({ name: ratingsName, user_id: req.user.id, type: 1 }).save();
      } else {
        writeReport(reportPath, `Rating for deals ${companyName} not provided`)
      }

      if(currency) { serCurrency = currency.serialize()
      } else if (currencyName) {
        serCurrency = await PipelineExtra.forge({ name: currencyName, user_id: req.user.id, type: 4 }).save();
      } else {
        writeReport(reportPath, `Currency for deals ${companyName} not provided`)
      }

      if(company) {
        serCompany = company.serialize({ api: true })
      } else {
        serCompany = null;
        writeReport(reportPath, `There is no company named ${companyName}`)
      }

      if(sector) {
        serSector = sector.serialize({ api: true })
      } else if (sectorName)  {
        const getOrder = await Sector.getMaxOrder({ parent_id: 0 });
        const [order] = await Promise.all([ getOrder ])
        serSector = await Sector.forge({ name: sectorName, parent_id: 0, user_id: req.user.id, order }).save();
        writeReport(reportPath, `Sector not found for ${companyName} : Success created on database`)
      } else {
        writeReport(reportPath, `Sector for deals ${companyName} not provided`)
      }

      if (country) {
        serCountry = country.serialize();
      } else if (countryName) {
        serCountry = await Country.forge({ name: countryName, order: 1}).save();
      } else {
        serCountry = null
        writeReport(reportPath, `Country for deals ${companyName} not provided`)
      }

      if(fundraisestage) {
        serFundraiseStage = fundraisestage.serialize()
      } else if (fundraisingStageName) {
        serFundraiseStage = await Stage.forge({ name: fundraisingStageName })
        writeReport(reportPath, `Fundraise Stage for deals ${companyName} not provided:  succesfully created`)
      } else {
        serFundraiseStage = null
        writeReport(reportPath, `Fundraise for deals ${companyName} not provided`)
      }

      if(serCompany.text) {
        Pipeline.forge({
          company_id: serCompany.id,
          fundraise_current: fundRaisedExc || null,
          fundraise_open: fundRaiseOpenExc || null,
          pre_money_valuation: premoneyValuationExc || null,
          stage_id: null,
          rating: serRatings ? serRatings.id : null,
          status: null,
          action_id: serFundraiseStage ? serFundraiseStage.id : null,
          contact: null,
          priority: priorityDef ? priorityDef : null,
          tech_cat: serSector ? serSector.id : null,
          sector: textSector || null,
          country: serCountry ? serCountry.id : null,
          invest_note: dealsNote ? dealsNote : null,
          next_step: null,
          currency: serCurrency ? serCurrency.id : null,
          user_id: req.user.id,
        }).save();
      } else {
        writeReport(reportPath, `Deals not saved there is no company name!`)
      }
    })
    .flatMap(_)
    .filter((ignored) => false )
    .toPromise(Promise)

  writeReport(reportPath, `[END] Report for deals import ends!`)

  req.flash('report', `/files/report/${fileRename}`)
  return res.redirect('/pipelines')
}
