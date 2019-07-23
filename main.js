const Apify = require('apify')
const { log } = Apify.utils
const { takeScreenshot, gifAddFrame } = require('./helper')
// const gifEncoder = require('gif-encoder')
const gifEncoder = require('gifencoder')
const fs = require('fs')
// const getPixels = require('get-pixels')

Apify.main(async () => {
  const input = await Apify.getInput();
  const keyValueStore = await Apify.openKeyValueStore()

  const browser = await Apify.launchPuppeteer({
    useChrome: true,
    stealth: true
  })
  const page = await browser.newPage()

  log.info(`Setting page viewport to ${input.viewport.width}x${input.viewport.height}`)
  await page.setViewport({
    width: input.viewport.width,
    height: input.viewport.height
  })

  log.info(`Opening page: ${input.url}`)
  await page.goto(input.url, { waitUntil: 'networkidle2' })

  //scrolling
  const bodyHandle = await page.$('body');
  const { height: pageHeight } = await bodyHandle.boundingBox();  // get page height
  await bodyHandle.dispose();

  let scrolledUntil = input.viewport.height   // staring height is viewport height
  const amountToScroll = Math.round(input.viewport.height * input.scrollPercentage)

  // create base gif file to write to
  // let gif = await keyValueStore.setValue('scroll.gif', buffer, {
  //   contentType: 'image/gif',
  // })

  // let file = require('fs').createWriteStream('scroll.gif')
  // let gif = gifEncoder(input.viewport.width, input.viewport.height)

  // gif.setFrameRate(60)
  // gif.pipe(file)
  // gif.writeHeader()

  /* gifencoder part */
  const gif = new gifEncoder(input.viewport.width, input.viewport.height)
  gif.createWriteStream()
    .pipe(fs.createWriteStream('scroll.gif'))

  gif.start();
  gif.setRepeat(0);   // 0 for repeat, -1 for no-repeat
  gif.setDelay(150);  // frame delay in ms
  gif.setQuality(10); // image quality. 10 is default

  // click cookie pop-up away
  await page.click('[class*="cookie"] button')

  // add first frame multiple times so there is some delay before gif starts visually scrolling
  for (itt = 0; itt < input.beginDelay; itt++) {
    const initialScreenshotBuffer = await takeScreenshot(page, input)  // take screenshot each time so animations also show well
    await gifAddFrame(initialScreenshotBuffer, gif)
  }

  // scroll down
  while (pageHeight > scrolledUntil) {
    const screenshotBuffer = await takeScreenshot(page, input)

    await gifAddFrame(screenshotBuffer, gif)
    
    log.info(`Scrolling down by ${amountToScroll} pixels`)
    await page.evaluate(amountToScroll => {
      window.scrollBy(0, amountToScroll);
    }, amountToScroll);

    scrolledUntil += amountToScroll
  }

  gif.finish()

  // //gif part
  // const gif = new GIFEncoder(input.viewport.width, input.viewport.height)

  // // Setup gif gif parameters
  // gif.setFrameRate(60)  // Set delay based on amount of frames per second. Cannot be used with gif.setDelay
  // gif.setRepeat(0)  //Sets amount of times to repeat GIF. 0 -> loop indefinitely
  // // gif.pipe(file)
});

// GIF framerate
// GIF duration
// Delay before recording
// Element to click -> clickSelector
// Screen Dimensions -> viewport
// Desired Output resolution 
