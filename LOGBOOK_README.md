# Industrial Training Logbook

This directory contains the LaTeX source for the Industrial Training Logbook documenting a 7-month training period (April-October 2024) at CLS - Learning Solutions under DEPI.

## Contents

- `logbook.tex` - Main LaTeX source file containing the complete training documentation
- `logbook.pdf` - Pre-compiled PDF document (for convenience; can be regenerated from .tex)

## Student Information

- **Name:** Nada Ashraf Moussa Kamel Gomaa
- **ID:** 120210358
- **Company:** Egypt Digital Pioneers Initiative (CLS)
- **Training Period:** 7 Months (April to October 2024)
- **Major:** Computer Science and Engineering
- **Minor:** ECCE

## Training Topics Covered

The logbook documents 30 weeks of intensive training covering:

1. **Weeks 1-8:** SQL foundations, advanced queries, data warehousing, and ETL processes
2. **Weeks 9-12:** Python programming, data preprocessing, and exploratory data analysis
3. **Weeks 13-14:** Agile/Scrum methodology and project management
4. **Weeks 15-18:** Azure Data Fundamentals and cloud data solutions
5. **Weeks 19-24:** Natural Language Processing (traditional and deep learning approaches)
6. **Weeks 25-26:** Hugging Face ecosystem and transformer models
7. **Weeks 27-28:** MLOps and MLflow
8. **Weeks 29-30:** Prompt Engineering and Final Project (cheXray_Classifier)

## How to Compile

### Requirements

- LaTeX distribution (TeX Live, MiKTeX, or MacTeX)
- Required packages: `geometry`, `array`, `tabularx`, `enumitem`, `hyperref`, `xcolor`, `tcolorbox`, `setspace`, `graphicx`

### Compilation

```bash
pdflatex logbook.tex
```

For complete references and hyperlinks, run twice:
```bash
pdflatex logbook.tex
pdflatex logbook.tex
```

### Online Compilation

You can also compile this document using online LaTeX editors:
- [Overleaf](https://www.overleaf.com/)
- [Papeeria](https://papeeria.com/)
- [CoCalc](https://cocalc.com/)

## Document Structure

Each week entry contains:
- Date range
- Activities performed
- Summary of learning
- Key topics covered
- Achievement of the day
- Functional skills developed
- Soft skills developed

## Table Formatting

The document uses custom LaTeX macros for consistent formatting:
- `\WeekEntry{date}{week}{activities}{summary}{topics}{achievement}{functional_skills}{soft_skills}`
- Tables use `tabularx` for flexible column widths
- `tcolorbox` package provides styled boxes for visual appeal
- Proper text wrapping prevents overflow

## References

The logbook includes credible references and links to:
- Kaggle datasets
- TensorFlow documentation
- Keras API references
- Hugging Face documentation
- MLflow official documentation

## License

This document is part of the academic record for the Industrial Training program.
