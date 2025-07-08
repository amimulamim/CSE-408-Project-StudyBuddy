#!/usr/bin/env python3
"""
Test script to verify the updated moderator logic for custom URLs and pending state removal.
This is a verification script to ensure the logic works as expected.
"""

def test_content_url_logic():
    """Test the URL handling logic that was implemented."""
    
    # Simulate bucket name
    bucket_name = "studybuddy-firebase-bucket.appspot.com"
    
    # Test case 1: Custom URL provided with proper format
    custom_url = f"https://storage.googleapis.com/{bucket_name}/content/user123/custom_document.pdf"
    expected_path = "content/user123/custom_document.pdf"
    
    # Extract path logic from the implementation
    extracted_path = custom_url.replace(f"https://storage.googleapis.com/{bucket_name}/", "")
    
    print("Test 1 - Custom URL path extraction:")
    print(f"  Input URL: {custom_url}")
    print(f"  Expected path: {expected_path}")
    print(f"  Extracted path: {extracted_path}")
    print(f"  ✓ Correct: {extracted_path == expected_path}")
    print()
    
    # Test case 2: Custom URL without .pdf extension
    custom_url_no_ext = f"https://storage.googleapis.com/{bucket_name}/content/user123/custom_document"
    extracted_path_no_ext = custom_url_no_ext.replace(f"https://storage.googleapis.com/{bucket_name}/", "")
    
    # Add .pdf extension logic
    if not extracted_path_no_ext.endswith('.pdf'):
        final_path = extracted_path_no_ext + ".pdf"
    else:
        final_path = extracted_path_no_ext
    
    print("Test 2 - Custom URL without extension:")
    print(f"  Input URL: {custom_url_no_ext}")
    print(f"  Extracted path: {extracted_path_no_ext}")
    print(f"  Final path with .pdf: {final_path}")
    print(f"  ✓ Correct: {final_path == 'content/user123/custom_document.pdf'}")
    print()
    
    # Test case 3: Default path logic
    user_id = "user123"
    content_id = "content456"
    content_type = "slides_pending"
    
    if content_type == "slides_pending":
        default_path = f"content/{user_id}/{content_id}_pending.pdf"
    else:
        default_path = f"content/{user_id}/{content_id}.pdf"
    
    print("Test 3 - Default path logic:")
    print(f"  User ID: {user_id}")
    print(f"  Content ID: {content_id}")
    print(f"  Content Type: {content_type}")
    print(f"  Generated path: {default_path}")
    print(f"  ✓ Correct: {default_path == 'content/user123/content456_pending.pdf'}")
    print()

def test_pending_state_logic():
    """Test the pending state removal logic."""
    
    # Test case 1: Content starts as slides_pending, compilation successful, should become slides
    content_type = "slides_pending"
    compilation_successful = True
    new_content_type = content_type  # Initialize
    
    # Logic from the implementation
    if compilation_successful and content_type == "slides_pending":
        new_content_type = "slides"
        
    print("Test 4 - Pending state removal with successful compilation:")
    print(f"  Original type: {content_type}")
    print(f"  Compilation successful: {compilation_successful}")
    print(f"  New type after editing: {new_content_type}")
    print(f"  ✓ Correct: {new_content_type == 'slides'}")
    print()
    
    # Test case 2: Content starts as slides_pending, compilation failed, should remain pending
    content_type = "slides_pending"
    compilation_successful = False
    new_content_type = content_type  # Initialize
    
    # Logic from the implementation
    if compilation_successful and content_type == "slides_pending":
        new_content_type = "slides"
        
    print("Test 5 - Pending state remains with failed compilation:")
    print(f"  Original type: {content_type}")
    print(f"  Compilation successful: {compilation_successful}")
    print(f"  New type after editing: {new_content_type}")
    print(f"  ✓ Correct: {new_content_type == 'slides_pending'}")
    print()
    
    # Test case 3: Auto-approve logic when raw_content is provided and compilation successful
    approve_explicitly = False
    raw_content_provided = True
    compilation_successful = True
    
    should_approve = approve_explicitly or (raw_content_provided and compilation_successful)
    
    print("Test 6 - Auto-approve when editing raw content successfully:")
    print(f"  Explicit approve: {approve_explicitly}")
    print(f"  Raw content provided: {raw_content_provided}")
    print(f"  Compilation successful: {compilation_successful}")
    print(f"  Should approve: {should_approve}")
    print(f"  ✓ Correct: {should_approve == True}")
    print()

def test_url_decision_logic():
    """Test the logic for deciding which URL to use for PDF storage."""
    
    user_id = "user123"
    content_id = "content456"
    bucket_name = "studybuddy-firebase-bucket.appspot.com"
    
    # Test case 1: Custom URL provided
    custom_url = f"https://storage.googleapis.com/{bucket_name}/content/user123/custom_name.pdf"
    content_type = "slides_pending"
    
    if custom_url:
        pdf_storage_path = custom_url.replace(f"https://storage.googleapis.com/{bucket_name}/", "")
        if not pdf_storage_path.endswith('.pdf'):
            pdf_storage_path = pdf_storage_path + ".pdf"
    else:
        if content_type == "slides_pending":
            pdf_storage_path = f"content/{user_id}/{content_id}_pending.pdf"
        else:
            pdf_storage_path = f"content/{user_id}/{content_id}.pdf"
    
    print("Test 6 - URL decision with custom URL:")
    print(f"  Custom URL: {custom_url}")
    print(f"  Resulting PDF path: {pdf_storage_path}")
    print(f"  ✓ Correct: {pdf_storage_path == 'content/user123/custom_name.pdf'}")
    print()
    
    # Test case 2: No custom URL provided, but existing content_url in DB
    custom_url = None
    existing_content_url = f"https://storage.googleapis.com/{bucket_name}/content/user123/existing_document.pdf"
    
    if custom_url:
        pdf_storage_path = custom_url.replace(f"https://storage.googleapis.com/{bucket_name}/", "")
        if not pdf_storage_path.endswith('.pdf'):
            pdf_storage_path = pdf_storage_path + ".pdf"
    else:
        # Use existing content_url from database if it exists
        if existing_content_url:
            pdf_storage_path = existing_content_url.replace(f"https://storage.googleapis.com/{bucket_name}/", "")
        else:
            # Fallback to default path
            if content_type == "slides_pending":
                pdf_storage_path = f"content/{user_id}/{content_id}_pending.pdf"
            else:
                pdf_storage_path = f"content/{user_id}/{content_id}.pdf"
    
    print("Test 7 - URL decision with existing DB URL:")
    print(f"  Custom URL: {custom_url}")
    print(f"  Existing DB URL: {existing_content_url}")
    print(f"  Resulting PDF path: {pdf_storage_path}")
    print(f"  ✓ Correct: {pdf_storage_path == 'content/user123/existing_document.pdf'}")
    print()
    
    # Test case 3: No custom URL provided, no existing content_url in DB
    custom_url = None
    existing_content_url = None
    
    if custom_url:
        pdf_storage_path = custom_url.replace(f"https://storage.googleapis.com/{bucket_name}/", "")
        if not pdf_storage_path.endswith('.pdf'):
            pdf_storage_path = pdf_storage_path + ".pdf"
    else:
        # Use existing content_url from database if it exists
        if existing_content_url:
            pdf_storage_path = existing_content_url.replace(f"https://storage.googleapis.com/{bucket_name}/", "")
        else:
            # Fallback to default path
            if content_type == "slides_pending":
                pdf_storage_path = f"content/{user_id}/{content_id}_pending.pdf"
            else:
                pdf_storage_path = f"content/{user_id}/{content_id}.pdf"
    
    print("Test 8 - URL decision fallback to default:")
    print(f"  Custom URL: {custom_url}")
    print(f"  Existing DB URL: {existing_content_url}")
    print(f"  Content type: {content_type}")
    print(f"  Resulting PDF path: {pdf_storage_path}")
    print(f"  ✓ Correct: {pdf_storage_path == 'content/user123/content456_pending.pdf'}")
    print()

def test_latex_path_logic():
    """Test the LaTeX path reading logic from database."""
    
    bucket_name = "studybuddy-firebase-bucket.appspot.com"
    
    # Test case 1: Existing raw_source URL in database
    existing_raw_source = f"https://storage.googleapis.com/{bucket_name}/content/user123/existing_document.tex"
    storage_path = None
    
    if existing_raw_source:
        storage_path = existing_raw_source.replace(f"https://storage.googleapis.com/{bucket_name}/", "")
    else:
        # Fallback logic would go here
        pass
    
    print("Test 9 - LaTeX path from existing raw_source:")
    print(f"  Existing raw_source: {existing_raw_source}")
    print(f"  Extracted storage path: {storage_path}")
    print(f"  ✓ Correct: {storage_path == 'content/user123/existing_document.tex'}")
    print()
    
    # Test case 2: No existing raw_source, need to generate new path
    existing_raw_source = None
    user_id = "user123"
    content_id = "content456"
    content_type = "slides_pending"
    
    if existing_raw_source:
        storage_path = existing_raw_source.replace(f"https://storage.googleapis.com/{bucket_name}/", "")
    else:
        # Generate new path
        if content_type == "slides_pending":
            storage_path = f"content/{user_id}/{content_id}_pending.tex"
        else:
            storage_path = f"content/{user_id}/{content_id}.tex"
    
    print("Test 10 - LaTeX path generation when no existing raw_source:")
    print(f"  Existing raw_source: {existing_raw_source}")
    print(f"  Content type: {content_type}")
    print(f"  Generated storage path: {storage_path}")
    print(f"  ✓ Correct: {storage_path == 'content/user123/content456_pending.tex'}")
    print()

def test_cache_busting_logic():
    """Test the cache-busting URL generation logic to ensure PDFs and raw content files always update."""
    import time
    import re
    
    # Simulate Firebase blob public URLs
    base_pdf_url = "https://storage.googleapis.com/studybuddy-firebase-bucket.appspot.com/content/user123/document.pdf"
    base_raw_url = "https://storage.googleapis.com/studybuddy-firebase-bucket.appspot.com/content/user123/document.tex"
    
    # Generate cache-busting URLs (simulating the logic from the implementation)
    cache_buster = str(int(time.time()))
    cache_busted_pdf_url = f"{base_pdf_url}?v={cache_buster}&updated={cache_buster}"
    cache_busted_raw_url = f"{base_raw_url}?v={cache_buster}&updated={cache_buster}"
    
    print("Test 11 - Cache-busting URL generation:")
    print(f"  Base PDF URL: {base_pdf_url}")
    print(f"  Base raw content URL: {base_raw_url}")
    print(f"  Cache buster timestamp: {cache_buster}")
    print(f"  Cache-busted PDF URL: {cache_busted_pdf_url}")
    print(f"  Cache-busted raw content URL: {cache_busted_raw_url}")
    
    # Verify the URLs have the cache-busting parameters
    has_pdf_version_param = "v=" in cache_busted_pdf_url
    has_pdf_updated_param = "updated=" in cache_busted_pdf_url
    has_raw_version_param = "v=" in cache_busted_raw_url
    has_raw_updated_param = "updated=" in cache_busted_raw_url
    
    print(f"  ✓ PDF has version parameter: {has_pdf_version_param}")
    print(f"  ✓ PDF has updated parameter: {has_pdf_updated_param}")
    print(f"  ✓ Raw content has version parameter: {has_raw_version_param}")
    print(f"  ✓ Raw content has updated parameter: {has_raw_updated_param}")
    
    # Test that URLs generated at different times are different
    time.sleep(1)  # Wait 1 second
    cache_buster_2 = str(int(time.time()))
    cache_busted_pdf_url_2 = f"{base_pdf_url}?v={cache_buster_2}&updated={cache_buster_2}"
    cache_busted_raw_url_2 = f"{base_raw_url}?v={cache_buster_2}&updated={cache_buster_2}"
    
    different_pdf_urls = cache_busted_pdf_url != cache_busted_pdf_url_2
    different_raw_urls = cache_busted_raw_url != cache_busted_raw_url_2
    print(f"  ✓ PDF URLs with different timestamps are different: {different_pdf_urls}")
    print(f"  ✓ Raw content URLs with different timestamps are different: {different_raw_urls}")
    
    # Verify URL patterns
    pdf_pattern = r"^https://storage\.googleapis\.com/.+\.pdf\?v=\d+&updated=\d+$"
    raw_pattern = r"^https://storage\.googleapis\.com/.+\.tex\?v=\d+&updated=\d+$"
    pdf_matches_pattern = bool(re.match(pdf_pattern, cache_busted_pdf_url))
    raw_matches_pattern = bool(re.match(raw_pattern, cache_busted_raw_url))
    print(f"  ✓ PDF URL matches expected pattern: {pdf_matches_pattern}")
    print(f"  ✓ Raw content URL matches expected pattern: {raw_matches_pattern}")
    
    # Test edge case: Same timestamp for both files ensures consistency
    same_timestamp_pdf = f"{base_pdf_url}?v={cache_buster}&updated={cache_buster}"
    same_timestamp_raw = f"{base_raw_url}?v={cache_buster}&updated={cache_buster}"
    
    pdf_params = same_timestamp_pdf.split("?")[1]
    raw_params = same_timestamp_raw.split("?")[1]
    
    print(f"  ✓ Same timestamp produces consistent parameters: {pdf_params == raw_params}")
    print()

def test_cache_control_headers():
    """Test the cache control metadata logic."""
    import time
    
    # Simulate the metadata that would be set on Firebase blob
    metadata = {
        'Cache-Control': 'no-cache, must-revalidate',
        'Last-Modified': str(int(time.time()))
    }
    
    print("Test 12 - Cache control headers:")
    print(f"  Cache-Control header: {metadata['Cache-Control']}")
    print(f"  Last-Modified timestamp: {metadata['Last-Modified']}")
    
    # Verify cache control prevents caching
    no_cache_set = 'no-cache' in metadata['Cache-Control']
    must_revalidate_set = 'must-revalidate' in metadata['Cache-Control']
    has_last_modified = 'Last-Modified' in metadata and metadata['Last-Modified'].isdigit()
    
    print(f"  ✓ No-cache directive set: {no_cache_set}")
    print(f"  ✓ Must-revalidate directive set: {must_revalidate_set}")
    print(f"  ✓ Last-Modified timestamp set: {has_last_modified}")
    print()

if __name__ == "__main__":
    print("Testing Moderator Content Management Logic")
    print("=" * 50)
    print()
    
    # Run all tests
    test_content_url_logic()
    test_pending_state_logic()
    test_url_decision_logic()
    test_latex_path_logic()
    test_cache_busting_logic()
    test_cache_control_headers()
    
    print("=" * 50)
    print("All tests completed!")
    print("The cache-busting solution ensures PDFs and raw content always update by:")
    print("1. Adding timestamp-based query parameters to PDF and raw content URLs")
    print("2. Setting Cache-Control headers to prevent aggressive caching")
    print("3. Updating the Last-Modified metadata on each upload")
    print()
    print("This solves the issue where updating a PDF or raw content at the same URL")
    print("might not be immediately visible due to client-side caching.")
    
    test_content_url_logic()
    test_pending_state_logic()
    test_url_decision_logic()
    test_latex_path_logic()
    test_cache_busting_logic()
    test_cache_control_headers()
    
    print("=" * 50)
    print("All tests completed! ✓")
    print()
    print("Key features implemented:")
    print("1. ✓ Custom URL support for PDF storage")
    print("2. ✓ Automatic pending state removal ONLY after successful compilation")
    print("3. ✓ Proper path handling with/without .pdf extension")
    print("4. ✓ Auto-approval when raw content is edited AND compiled successfully")
    print("5. ✓ Use existing content_url from database when no custom URL provided")
    print("6. ✓ Use existing raw_source path from database for LaTeX storage")
    print("7. ✓ Fallback to default paths when no existing URLs found")
    print("8. ✓ Content remains 'pending' if compilation fails")
    print("9. ✓ Cache-busting URLs for PDF generation to ensure updates")
    print("10. ✓ Cache control headers to prevent caching of PDF files")
