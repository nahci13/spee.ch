const Handlebars = require('handlebars');
const { site, claim: claimDefaults } = require('../config/speechConfig.js');

function determineOgTitle (storedTitle, defaultTitle) {
  return ifEmptyReturnOther(storedTitle, defaultTitle);
};

function determineOgDescription (storedDescription, defaultDescription) {
  const length = 200;
  let description = ifEmptyReturnOther(storedDescription, defaultDescription);
  if (description.length >= length) {
    description = `${description.substring(0, length)}...`;
  };
  return description;
};

function ifEmptyReturnOther (value, replacement) {
  if (value === '') {
    return replacement;
  }
  return value;
}

function determineContentTypeFromFileExtension (fileExtension) {
  switch (fileExtension) {
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'mp4':
      return 'video/mp4';
    default:
      return 'image/jpeg';
  }
};

function determineOgThumbnailContentType (thumbnail) {
  if (thumbnail) {
    if (thumbnail.lastIndexOf('.') !== -1) {
      return determineContentTypeFromFileExtension(thumbnail.substring(thumbnail.lastIndexOf('.')));
    }
  }
  return '';
}

function createOpenGraphDataFromClaim (claim, defaultTitle, defaultDescription) {
  let openGraphData = {};
  openGraphData['embedUrl'] = `${site.host}/${claim.claimId}/${claim.name}`;
  openGraphData['showUrl'] = `${site.host}/${claim.claimId}/${claim.name}`;
  openGraphData['source'] = `${site.host}/${claim.claimId}/${claim.name}.${claim.fileExt}`;
  openGraphData['directFileUrl'] = `${site.host}/${claim.claimId}/${claim.name}.${claim.fileExt}`;
  openGraphData['ogTitle'] = determineOgTitle(claim.title, defaultTitle);
  openGraphData['ogDescription'] = determineOgDescription(claim.description, defaultDescription);
  openGraphData['ogThumbnailContentType'] = determineOgThumbnailContentType(claim.thumbnail);
  return openGraphData;
};

module.exports = {
  placeCommonHeaderTags () {
    const headerBoilerplate = `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no"><meta http-equiv="X-UA-Compatible" content="ie=edge"><title>${site.title}</title><link rel="stylesheet" href="/assets/css/reset.css" type="text/css"><link rel="stylesheet" href="/assets/css/general.css" type="text/css"><link rel="stylesheet" href="/assets/css/mediaQueries.css" type="text/css">`;
    return new Handlebars.SafeString(headerBoilerplate);
  },
  addOpenGraph (claim) {
    const { ogTitle, ogDescription, showUrl, source, ogThumbnailContentType } = createOpenGraphDataFromClaim(claim, claimDefaults.defaultTitle, claimDefaults.defaultDescription);
    const thumbnail = claim.thumbnail;
    const contentType = claim.contentType;
    const ogTitleTag = `<meta property="og:title" content="${ogTitle}" />`;
    const ogUrlTag = `<meta property="og:url" content="${showUrl}" />`;
    const ogSiteNameTag = `<meta property="og:site_name" content="${site.title}" />`;
    const ogDescriptionTag = `<meta property="og:description" content="${ogDescription}" />`;
    const ogImageWidthTag = '<meta property="og:image:width" content="600" />';
    const ogImageHeightTag = '<meta property="og:image:height" content="315" />';
    const basicTags = `${ogTitleTag} ${ogUrlTag} ${ogSiteNameTag} ${ogDescriptionTag} ${ogImageWidthTag} ${ogImageHeightTag}`;
    let ogImageTag = `<meta property="og:image" content="${source}" />`;
    let ogImageTypeTag = `<meta property="og:image:type" content="${contentType}" />`;
    let ogTypeTag = `<meta property="og:type" content="article" />`;
    if (contentType === 'video/mp4') {
      const ogVideoTag = `<meta property="og:video" content="${source}" />`;
      const ogVideoSecureUrlTag = `<meta property="og:video:secure_url" content="${source}" />`;
      const ogVideoTypeTag = `<meta property="og:video:type" content="${contentType}" />`;
      ogImageTag = `<meta property="og:image" content="${thumbnail}" />`;
      ogImageTypeTag = `<meta property="og:image:type" content="${ogThumbnailContentType}" />`;
      ogTypeTag = `<meta property="og:type" content="video" />`;
      return new Handlebars.SafeString(`${basicTags} ${ogImageTag} ${ogImageTypeTag} ${ogTypeTag} ${ogVideoTag} ${ogVideoSecureUrlTag} ${ogVideoTypeTag}`);
    } else {
      if (contentType === 'image/gif') {
        ogTypeTag = `<meta property="og:type" content="video.other" />`;
      };
      return new Handlebars.SafeString(`${basicTags} ${ogImageTag} ${ogImageTypeTag} ${ogTypeTag}`);
    }
  },
  addTwitterCard (claim) {
    const { embedUrl, directFileUrl } = createOpenGraphDataFromClaim(claim, claimDefaults.defaultTitle, claimDefaults.defaultDescription);
    const basicTwitterTags = `<meta name="twitter:site" content="@spee_ch" >`;
    const contentType = claim.contentType;
    if (contentType === 'video/mp4') {
      const twitterName = '<meta name="twitter:card" content="player" >';
      const twitterPlayer = `<meta name="twitter:player" content="${embedUrl}" >`;
      const twitterPlayerWidth = '<meta name="twitter:player:width" content="600" >';
      const twitterTextPlayerWidth = '<meta name="twitter:text:player_width" content="600" >';
      const twitterPlayerHeight = '<meta name="twitter:player:height" content="337" >';
      const twitterPlayerStream = `<meta name="twitter:player:stream" content="${directFileUrl}" >`;
      const twitterPlayerStreamContentType = '<meta name="twitter:player:stream:content_type" content="video/mp4" >';
      return new Handlebars.SafeString(`${basicTwitterTags} ${twitterName} ${twitterPlayer} ${twitterPlayerWidth} ${twitterTextPlayerWidth} ${twitterPlayerHeight} ${twitterPlayerStream} ${twitterPlayerStreamContentType}`);
    } else {
      const twitterCard = '<meta name="twitter:card" content="summary_large_image" >';
      return new Handlebars.SafeString(`${basicTwitterTags} ${twitterCard}`);
    }
  },
};
