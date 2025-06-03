if __name__ == "__main__":
    doc_processor = DocumentProcessor()
    query_processor = QueryProcessor()

    try:
        document_id = doc_processor.process_document("sample.pdf")
        logger.info(f"Processed document with ID: {document_id}")
    except Exception as e:
        logger.error(f"Document processing failed: {str(e)}")

    try:
        exam = query_processor.generate_exam(
            query="Python programming basics",
            num_questions=5,
            question_type="multiple_choice"
        )
        logger.info(f"Generated exam: {exam}")
    except Exception as e:
        logger.error(f"Exam generation failed: {str(e)}")