package com.algodon.audit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class ImportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testEmptyFileUpload() throws Exception {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file", 
                "empty.xlsx", 
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
                new byte[0]
        );
        
        mockMvc.perform(multipart("/api/import").file(emptyFile))
                .andExpect(status().isBadRequest());
    }
}
