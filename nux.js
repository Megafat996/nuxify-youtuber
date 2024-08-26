const imagesPath = "images/";
var useAlternativeImages
var flipBlacklist // Stores flipBlackList.js
var blacklistStatus
var extensionName = chrome.runtime.getManifest().name;

// Config
var extensionIsDisabled = false
var appearChance = 1.00//%
var flipChance = 0.01//%


// Apply the overlay
function applyOverlay(thumbnailElement, overlayImageURL, flip = false) {
    // Create a new img element for the overlay
    const overlayImage = document.createElement("img");
    overlayImage.id = extensionName;
    overlayImage.src = overlayImageURL;
    overlayImage.style.position = "absolute";
    overlayImage.style.top = overlayImage.style.left = "50%";
    overlayImage.style.width = "100%";
    overlayImage.style.transform = `translate(-50%, -50%) ${flip ? 'scaleX(-1)' : ''}`; // Center and flip the image
    overlayImage.style.zIndex = "0"; // Ensure overlay is on top but below the time indicator
    thumbnailElement.parentElement.insertBefore(overlayImage, thumbnailElement.nextSibling /*Makes sure the image doesn't cover any info, but still overlays the original thumbnail*/ );
};

function FindThumbnails() {
    var thumbnailImages = document.querySelectorAll("ytd-thumbnail a > yt-image > img.yt-core-image");
    var notificationImages = document.querySelectorAll('img.style-scope.yt-img-shadow[width="86"]');

    const allImages = [ // Put all the selected images into an array
        ...Array.from(thumbnailImages),
        ...Array.from(notificationImages),
    ];

    // Check whether the aspect ratio matches that of a thumbnail
    const targetAspectRatio = [16 / 9, 4 / 3];
    const errorMargin = 0.02; // Allows for 4:3, since YouTube is badly coded

    var listAllThumbnails = allImages.filter(image => {
        // Check if the height is not 0 before calculating the aspect ratio
        if (image.height === 0) {
            return false;
        }

        const aspectRatio = image.width / image.height;
        let isCorrectAspectRatio = (Math.abs(aspectRatio - targetAspectRatio[0]) < errorMargin) || (Math.abs(aspectRatio - targetAspectRatio[1]) < errorMargin);
        return isCorrectAspectRatio;
    });

    // Select all images from the recommended video screen
    var videowallImages = document.querySelectorAll(".ytp-videowall-still-image"); // Because youtube video wall images are not properly classified as images

    listAllThumbnails = listAllThumbnails.concat(Array.from(videowallImages));

    return listAllThumbnails.filter(image => {
        const parent = image.parentElement;

        // Checks whether it's a video preview
        const isVideoPreview = parent.closest("#video-preview") !== null || parent.tagName == "YTD-MOVING-THUMBNAIL-RENDERER"

        // Checks whether it's a chapter thumbnail
        const isChapter = parent.closest("#endpoint") !== null

        // Check if thumbnails have already been processed
        const processed = Array.from(parent.children).filter(child => {
            const alreadyHasAThumbnail =
                child.id && // Child has ID
                child.id.includes(extensionName);

            return (
                alreadyHasAThumbnail
                || isVideoPreview
                || isChapter
            )
        });

        return processed.length == 0;
    });
}

// Looks for all thumbnails and applies overlay
function applyOverlayToThumbnails() {
    thumbnailElements = FindThumbnails()

    // Apply overlay to each thumbnail
    thumbnailElements.forEach((thumbnailElement) => {
        // Apply overlay and add to processed thumbnails
        const loops = Math.random() > 0.001 ? 1 : 20; // Easter egg

        for (let i = 0; i < loops; i++) {
            // Determine the image URL and whether it should be flipped
            let flip = Math.random() < flipChance;
            let baseImagePath = getRandomImageFromDirectory();

            flip = false;
            const overlayImageURL = Math.random() < appearChance ?
                getImageURL(baseImagePath) :
                ""; // Just set the url to "" if we don't want MrBeast to appear lol

            applyOverlay(thumbnailElement, overlayImageURL, flip);
        }
    });

}

// Get the URL of an image
function getImageURL(index) {
    return chrome.runtime.getURL(`${imagesPath}${index}.png`);
}

// Checks if an image exists in the image folder
async function checkImageExistence(index) {
    const testedURL = getImageURL(index)

    return fetch(testedURL)
        .then(() => {
            return true
        }).catch(error => {
            return false
        })
}

////////////////////////
//  BrandonXLF Magic  //
////////////////////////

// Defines the N size of last images that will not be repeated.
const size_of_non_repeat = 0
// List of the index of the last N selected images.
const last_indexes = Array(size_of_non_repeat)

// Get a random image URL from a directory
function getRandomImageFromDirectory() {
    let randomIndex = -1

    // It selects a random index until it finds one that is not repeated
    while (last_indexes.includes(randomIndex) || randomIndex < 0) {
        randomIndex = Math.floor(Math.random() * highestImageIndex) + 1;
    }

    // When it finds the non repeating index, it eliminates the oldest value, and pushes the current index
    last_indexes.shift()
    last_indexes.push(randomIndex)

    return randomIndex
}

var highestImageIndex;
// Gets the highest index of an image in the image folder starting from 1
async function getHighestImageIndex() {
    // Avoid exponential search for smaller values
    let i = 4;

    // Increase i until i is greater than the number of images
    while (await checkImageExistence(i)) {
        i *= 2;
    }

    // Possible min and max values
    let min = i <= 4 ? 1 : i / 2;
    let max = i;

    // Binary search
    while (min <= max) {
        // Find the midpoint of possible max and min
        let mid = Math.floor((min + max) / 2);

        // Check if the midpoint exists
        if (await checkImageExistence(mid)) {
            // If it does, next min to check is one greater
            min = mid + 1;
        } else {
            // If it doesn't, max must be at least one less
            max = mid - 1;
        }
    }

    // Max is the size of the image array
    highestImageIndex = max;
}
////////////////////////
//  BrandonXLF Magic  //
////////////////////////

function GetFlipBlocklist() {
    fetch(chrome.runtime.getURL(`${imagesPath}flip_blacklist.json`))
        .then(response => response.json())
        .then(data => {
            useAlternativeImages = data.useAlternativeImages;
            flipBlacklist = data.blacklistedImages;

            blacklistStatus = "Flip blacklist found. " + (useAlternativeImages ? "Images will be substituted." : "Images won't be flipped.")
        })
        .catch((error) => {
            blacklistStatus = "No flip blacklist found. Proceeding without it."
        });
}

async function LoadConfig() {
    const df /* default */ = {
        extensionIsDisabled: extensionIsDisabled,
        appearChance: appearChance,
        flipChance: flipChance
    }

    try {
        const config = await new Promise((resolve, reject) => {
            chrome.storage.local.get({
                extensionIsDisabled,
                appearChance,
                flipChance
            }, (result) => {
                chrome.runtime.lastError ? // Check for errors
                    reject(chrome.runtime.lastError) : // Reject if errors
                    resolve(result) // Resolve if no errors
            });
        });

        // Initialize variables based on loaded configuration
        extensionIsDisabled = config.extensionIsDisabled || df.extensionIsDisabled;
        appearChance = config.appearChance || df.appearChance;
        flipChance = config.flipChance || df.flipChance;

        if (Object.keys(config).length === 0 && config.constructor === Object /* config doesn't exist */) {
            await new Promise((resolve, reject) => {
                chrome.storage.local.set(df, () => {
                    chrome.runtime.lastError ? // Check for errors
                        reject(chrome.runtime.lastError) : // Reject if errors
                        resolve() // Resolve if no errors
                })
            }
            )
        }
    } catch (error) { console.error("Guhh?? Error loading configuration:", error); }
}

async function Main() {
    await LoadConfig()

    if (extensionIsDisabled) {
        console.log(`${extensionName} is disabled.`)
        return // Exit the function if MrBeastify is disabled
    }

    GetFlipBlocklist()
    console.log(`${extensionName} will now detect the amount of images. Ignore all the following errors.`)
    getHighestImageIndex()
        .then(() => {
            setInterval(applyOverlayToThumbnails, 100);
            console.log(
                `${extensionName} Loaded Successfully. ${highestImageIndex} images detected. ${blacklistStatus}.`
            );

        })
}

Main()

/* My code */
// Function to modify video titles
function modifyTitles() {
    const elements = document.querySelectorAll("#video-title");
    elements.forEach(element => {
        if (!element.dataset.modified) {  // Check if already modified to prevent redundant changes
            element.innerText = element.innerText.replace(/\bI\b/g, "We")       // Replace standalone "I"
                                                 .replace(/\bMy\b/gi, "Our")    // Replace "My" (case insensitive)
                                                 .replace(/\bMe\b/gi, "us");    // Replace "Me" (case insensitive)
            element.dataset.modified = "true";  // Mark as modified
        }
    });
}

// Debounce function to limit how often modifyTitles runs
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

const debouncedModifyTitles = debounce(modifyTitles, 200);

// Detect URL changes and call modifyTitles
let lastUrl = location.href;
new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        debouncedModifyTitles();
    }
}).observe(document, { subtree: true, childList: true });

// Initial modification on page load
modifyTitles();

// Observe for dynamic content changes
const observer = new MutationObserver(debouncedModifyTitles);
const targetNode = document.querySelector('#contents'); // Narrowed down to main content container
if (targetNode) {
    observer.observe(targetNode, { childList: true, subtree: true });
}