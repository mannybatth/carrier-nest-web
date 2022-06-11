# A script that take a zip file, read all contents to memory and for all pdf files, extract the images and save them in a folder.

import os
import sys
from zipfile import ZipFile
from pdf2image import convert_from_bytes
import numpy as np
import cv2
from PIL import Image

source = sys.argv[1]
destination = sys.argv[2]

def convert_pdf_to_image(pdf_bytes):
    images = []
    images.extend(
                    list(
                        map(
                            lambda image: cv2.cvtColor(
                                np.asarray(image), code=cv2.COLOR_RGB2BGR
                            ),
                            convert_from_bytes(pdf_bytes, dpi=300, fmt="png"),
                        )
                    )
                )
    return images

def preprocess_image(image):
    removed = image.copy()
    gray = cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
    _,thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    thresh2 = thresh.copy()
    mask = np.zeros(thresh.shape,np.uint8)

    contours, hier = cv2.findContours(thresh,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
    for cnt in contours:
        x = cv2.contourArea(cnt);

        if x > 100000:
            _mask = np.zeros(thresh.shape, dtype="uint8")
            cv2.drawContours(_mask, [cnt], -1, 255, -1)

            mean = cv2.mean(thresh, mask=_mask)

            if mean[0] > 200:
                cv2.drawContours(image,[cnt],0,(0,255,0),2)
                cv2.drawContours(mask,[cnt],0,255,-1)

    cv2.bitwise_not(thresh2,thresh2,mask)

    # Remove vertical lines
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1,40))
    remove_vertical = cv2.morphologyEx(thresh2, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
    cnts = cv2.findContours(remove_vertical, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = cnts[0] if len(cnts) == 2 else cnts[1]
    for c in cnts:
        cv2.drawContours(removed, [c], -1, (255,255,255), 10)

    # Remove horizontal lines
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40,1))
    remove_horizontal = cv2.morphologyEx(thresh2, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
    cnts = cv2.findContours(remove_horizontal, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = cnts[0] if len(cnts) == 2 else cnts[1]
    for c in cnts:
        cv2.drawContours(removed, [c], -1, (255,255,255), 3)

    # Repair kernel
    repair_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3,3))
    removed = 255 - removed
    dilate = cv2.dilate(removed, repair_kernel, iterations=5)
    dilate = cv2.cvtColor(dilate, cv2.COLOR_BGR2GRAY)
    pre_result = cv2.bitwise_and(dilate, thresh2)

    result = cv2.morphologyEx(pre_result, cv2.MORPH_CLOSE, repair_kernel, iterations=5)
    final = cv2.bitwise_and(result, thresh2)

    invert_final = 255 - final

    invert_final = cv2.GaussianBlur(invert_final, (5, 5), 0)

    return invert_final

def extract_images(source, destination):
    with ZipFile(source, 'r') as zip:
        for name in zip.namelist():
            if name.endswith('.pdf'):
                # Ignore macos files. Ignore files that contain __MACOSX
                if '__MACOSX' in name:
                    continue

                print('Extracting images from ' + name)

                # Read contents of the pdf file to memory
                pdf_bytes = zip.read(name)

                # Convert pdf to images
                images = convert_pdf_to_image(pdf_bytes)

                file_name = name.split('.')[0]

                # Make the directory if it doesn't exist
                if not os.path.exists(destination):
                    os.makedirs(destination)

                # Save images to destination folder
                for i, image in enumerate(images):
                    npimage = preprocess_image(image)

                    imgToSave = Image.fromarray(npimage)

                    imgToSave.save(os.path.join(
                        destination, file_name + '_' + str(i + 1) + '.png'))


if __name__ == '__main__':
    extract_images(source, destination)
