const lbryApi = require('../helpers/lbryApi.js');
const db = require('../models');
const logger = require('winston');
const { getTopFreeClaim, getFullClaimIdFromShortId, resolveAgainstClaimTable } = require('../helpers/serveHelpers.js');

function checkForLocalAssetByClaimId (claimId, name) {
  return new Promise((resolve, reject) => {
    db.File
      .findOne({where: { name, claimId }})
      .then(result => {
        if (result) {
          resolve(result.dataValues);
        } else {
          resolve(null);
        }
      })
      .catch(error => {
        reject(error);
      });
  });
}

function formatGetResultsToFileInfo ({ name, claim_id, outpoint, file_name, download_path, mime_type, metadata }) {
  return {
    name,
    claimId : claim_id,
    outpoint,
    fileName: file_name,
    filePath: download_path,
    fileType: mime_type,
    nsfw    : metadata.stream.metadata.nsfw,
  };
}

function getAssetByClaimId (fullClaimId, name) {
  logger.debug('...getting asset by claim Id...');
  return new Promise((resolve, reject) => {
    // 1. check locally for claim
    checkForLocalAssetByClaimId(fullClaimId, name)
    .then(dataValues => {
      // if a result was found, return early with the result
      if (dataValues) {
        logger.debug('found a local file for this name and claimId');
        return resolve(dataValues);
      }
      logger.debug('no local file found for this name and claimId');
      // 2. if no local claim, resolve and get the claim
      resolveAgainstClaimTable(name, fullClaimId)
      .then(resolveResult => {
        logger.debug('resolve result >> ', resolveResult);
        // if no result, return early (claim doesn't exist or isn't free)
        if (!resolveResult) {
          return resolve(null);
        }
        let fileRecord = {};
        // get the claim
        lbryApi.getClaim(`${name}#${fullClaimId}`)
        .then(getResult => {
          logger.debug('getResult >>', getResult);
          fileRecord = formatGetResultsToFileInfo(getResult);
          fileRecord['address'] = (resolveResult.address || 0);
          fileRecord['height'] = resolveResult.height;
          // insert a record in the File table & Update Claim table
          return db.File.create(fileRecord);
        })
        .then(fileRecordResults => {
          logger.debug('File record successfully updated');
          resolve(fileRecord);
        })
        .catch(error => {
          reject(error);
        });
      })
      .catch(error => {
        reject(error);
      });
    })
    .catch(error => {
      reject(error);
    });
  });
}

module.exports = {
  getAssetByChannel (channelName, name) {
    logger.debug('...getting asset by channel...');
    return new Promise((resolve, reject) => {
      // temporarily throw error
      reject(new Error('channel names are not currently supported'));
      // get the claim id
      // get the asset by claim Id
    });
  },
  getAssetByShortId: function (shortId, name) {
    logger.debug('...getting asset by short id...');
    return new Promise((resolve, reject) => {
      // get the full claimId
      getFullClaimIdFromShortId(shortId, name)
      // get the asset by the claimId
      .then(claimId => {
        logger.debug('claim id =', claimId);
        resolve(getAssetByClaimId(claimId, name));
      })
      .catch(error => {
        reject(error);
      });
    });
  },
  getAssetByClaimId (fullClaimId, name) {
    return getAssetByClaimId(fullClaimId, name);
  },
  getAssetByName (name) {
    logger.debug('...getting asset by claim name...');
    return new Promise((resolve, reject) => {
      // 1. get a list of the free public claims
      getTopFreeClaim(name)
      // 2. check locally for the top claim
      .then(topFreeClaim => {
        // if no claims were found, return null
        if (!topFreeClaim) {
          return resolve(null);
        }
        // parse the result
        const claimId = topFreeClaim.claimId;
        logger.debug('top free claim id =', claimId);
        // get the asset
        resolve(getAssetByClaimId(claimId, name));
      })
      .catch(error => {
        reject(error);
      });
    });
  },
};
